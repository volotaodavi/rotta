import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { DiditConfig } from "@/config/didit.config";

import { IntegrationHealthService } from "@/infra/observability/integration-health.service";

/** Chave nos snapshots de `IntegrationHealthService` (Admin Rotta → `GET /health/integrations`). */
export const DIDIT_INTEGRATION_NAME = "didit";

export interface DiditIdVerificationResult {
  status: string;
  aprovado: boolean;
  tipoDocumento?: string;
  dadosBrutos: Record<string, unknown>;
}

export interface DiditFaceMatchResult {
  status: string;
  aprovado: boolean;
  score?: number;
  dadosBrutos: Record<string, unknown>;
}

export interface DiditLivenessResult {
  status: string;
  aprovado: boolean;
  dadosBrutos: Record<string, unknown>;
}

/** A Didit usa "Approved"/"Declined"/"In Review" — só o primeiro conta como aprovado. */
const STATUS_APROVADO = "approved";

/**
 * Cliente da Didit (didit.me) — provedor de verificação de identidade
 * (ID Verification/OCR, Face Match, Passive Liveness) usado por
 * `RottaAiService` para os checks CNH/SELFIE/FACE_MATCH/OCR (Dossiê 15).
 * Chamada HTTP direta (REST puro, sem SDK) às APIs "standalone" da
 * Didit (https://docs.didit.me/standalone-apis) — cada verificação é
 * uma única chamada `multipart/form-data` com `x-api-key`, sem sessão
 * nem workflow, ideal para o fluxo da Rotta: o app já fez upload do
 * arquivo para o Supabase Storage, então só baixamos a imagem pela URL
 * pública e reenviamos para a Didit.
 *
 * ESCOPO: cobre identidade da PESSOA (documento de identidade
 * reconhecido mundialmente + biometria facial) — não cobre documentos
 * de VEÍCULO (CRLV/Seguro/Vistoria) nem EAR/Curso, que não são
 * documentos de identidade no catálogo da Didit; esses continuam como
 * stub honesto em `RottaAiService.analyzeVehicleDocument`.
 */
@Injectable()
export class DiditService {
  private readonly logger = new Logger(DiditService.name);
  private readonly config: DiditConfig;

  constructor(
    configService: ConfigService,
    private readonly integrationHealth: IntegrationHealthService,
  ) {
    this.config = configService.get<DiditConfig>("didit")!;
  }

  /** OCR + verificação de autenticidade do documento de identidade (CNH/RG/passaporte). `backImageUrl` opcional — a CNH física brasileira é frente única. */
  async verifyId(frontImageUrl: string, backImageUrl?: string): Promise<DiditIdVerificationResult> {
    this.assertConfigured();
    const form = new FormData();
    form.append("front_image", await this.downloadAsBlob(frontImageUrl), "front.jpg");
    if (backImageUrl) {
      form.append("back_image", await this.downloadAsBlob(backImageUrl), "back.jpg");
    }

    const body = await this.post("/v3/id-verification/", form);
    const status = normalizeStatus(body.status);
    return {
      status,
      aprovado: status === STATUS_APROVADO,
      tipoDocumento: typeof body.document_type === "string" ? body.document_type : undefined,
      dadosBrutos: body,
    };
  }

  /** Compara duas imagens faciais (ex. selfie vs. foto da CNH) — 1:1 Face Match. */
  async faceMatch(userImageUrl: string, refImageUrl: string): Promise<DiditFaceMatchResult> {
    this.assertConfigured();
    const form = new FormData();
    form.append("user_image", await this.downloadAsBlob(userImageUrl), "user.jpg");
    form.append("ref_image", await this.downloadAsBlob(refImageUrl), "ref.jpg");

    const body = await this.post("/v3/face-match/", form);
    const status = normalizeStatus(body.status);
    const score = typeof body.score === "number" ? body.score : undefined;
    return { status, aprovado: status === STATUS_APROVADO, score, dadosBrutos: body };
  }

  /** Confirma que a selfie mostra uma pessoa fisicamente presente (anti-spoofing), sem precisar de interação. */
  async passiveLiveness(imageUrl: string): Promise<DiditLivenessResult> {
    this.assertConfigured();
    const form = new FormData();
    form.append("image", await this.downloadAsBlob(imageUrl), "selfie.jpg");

    const body = await this.post("/v3/passive-liveness/", form);
    const status = normalizeStatus(body.status);
    return { status, aprovado: status === STATUS_APROVADO, dadosBrutos: body };
  }

  /** Checagem em memória, sem I/O — roda ANTES de qualquer download de imagem, para nunca vazar um erro de rede confuso no lugar de "Didit não configurada". */
  private assertConfigured(): void {
    if (!this.config.apiKey) {
      void this.integrationHealth.recordNotConfigured(
        DIDIT_INTEGRATION_NAME,
        "DIDIT_API_KEY ausente neste ambiente.",
      );
      throw new ServiceUnavailableException(
        "Didit não configurada neste ambiente (DIDIT_API_KEY ausente).",
      );
    }
  }

  /** Só chamado a partir de métodos que já rodaram `assertConfigured` antes de qualquer download — `apiKey` garantidamente presente aqui. */
  private async post(path: string, form: FormData): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      headers: { "x-api-key": this.config.apiKey! },
      body: form,
    });

    const rawBody = await response.text();
    const body = parseJsonSafely(rawBody) ?? {};

    if (!response.ok) {
      this.logger.warn(`Didit respondeu ${response.status} em ${path}: ${rawBody.slice(0, 300)}`);
      void this.integrationHealth.recordFailure(
        DIDIT_INTEGRATION_NAME,
        `HTTP ${response.status} em ${path}.`,
      );
      throw new Error(`Falha na verificação Didit (${path}): HTTP ${response.status}.`);
    }

    void this.integrationHealth.recordSuccess(DIDIT_INTEGRATION_NAME, Date.now() - startedAt);
    return body;
  }

  /** Baixa o arquivo já enviado ao Supabase Storage (URL pública) para reenviar à Didit. */
  private async downloadAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Não foi possível baixar o arquivo para verificação (${url}): HTTP ${response.status}.`,
      );
    }
    const buffer = await response.arrayBuffer();
    return new Blob([buffer]);
  }
}

function normalizeStatus(status: unknown): string {
  return typeof status === "string" ? status.toLowerCase() : "";
}

/** A Didit sempre responde JSON, mas um proxy/gateway intermediário pode devolver HTML/texto — nunca deixe isso virar um erro de parsing confuso (mesmo padrão de `meta-cloud-api-whatsapp.provider.ts`). */
function parseJsonSafely(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}
