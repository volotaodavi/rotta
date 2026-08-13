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

/** Retorno de `createVerificationSession` — só o que o chamador precisa para abrir o fluxo hospedado e correlacionar o webhook depois. */
export interface DiditVerificationSession {
  sessionId: string;
  url: string;
  status: string;
}

/** Retorno de `getSessionDecision` — `status` já normalizado (minúsculo) só para logging/health; quem decide o enum interno é `mapDiditStatus` (`didit-decision.util.ts`) sobre `raw.status`, o literal original da Didit ("Approved"/"Declined"/...). */
export interface DiditSessionDecision {
  sessionId: string;
  status: string;
  raw: Record<string, unknown>;
}

/** Os únicos três valores que `PATCH /v3/session/{id}/update-status/` aceita em `new_status` (docs.didit.me/sessions-api/update-status). */
export type DiditManualStatus = "Approved" | "Declined" | "Resubmitted";

/** Um destino de webhook já cadastrado (`GET /v3/webhook/destinations/`) — só os campos que `DiditWebhookProvisioningService` de fato usa (achar se um destino já aponta para a nossa URL). */
export interface DiditWebhookDestination {
  id: string;
  url: string;
}

/** Retorno de `createWebhookDestination` — `secret` é o `secret_shared_key` que a Didit só mostra UMA vez, na criação (nunca de novo em nenhuma consulta posterior). */
export interface DiditCreatedWebhookDestination {
  id: string;
  secret: string;
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
 *
 * `createVerificationSession` é um segundo modo de uso — a API de
 * SESSÃO (`POST /v3/session/`, JSON puro) da Didit, não uma das
 * standalone acima: em vez da Rotta enviar uma imagem já capturada,
 * abre-se uma URL hospedada pela própria Didit (captura guiada por ela)
 * e a decisão chega depois via webhook (`DiditWebhookController`).
 * Usado por `IdentityVerificationModule` (Motorista/Empresa-Gestor
 * verificando a própria identidade), complementar — não um substituto —
 * do fluxo standalone acima.
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

  /**
   * Cria uma sessão de verificação hospedada (`POST /v3/session/`) — a
   * Didit devolve uma `url` (SDK web/iframe/redirect) que o usuário abre
   * para completar a captura pelo lado dela; a decisão final chega
   * depois via webhook, não na resposta desta chamada (`status` aqui é
   * sempre "Not Started"/"In Progress" logo após a criação).
   *
   * `vendorData` é o identificador estável da Rotta para a pessoa (aqui,
   * `User.id`) — é o que o webhook devolve em `vendor_data` pra
   * correlacionar o evento de volta a ela. `callbackUrl` é opcional
   * (Didit docs: "where Didit returns the user after the flow") — quem
   * chama decide pra onde redirecionar de volta, mesmo padrão de
   * `BillingService.createCheckoutForCompany(returnUrl)`.
   */
  async createVerificationSession(
    vendorData: string,
    callbackUrl?: string,
  ): Promise<DiditVerificationSession> {
    this.assertConfigured();
    const body = await this.postJson("/v3/session/", {
      workflow_id: this.config.workflowId,
      vendor_data: vendorData,
      ...(callbackUrl ? { callback: callbackUrl } : {}),
    });

    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    const url = typeof body.url === "string" ? body.url : "";
    if (!sessionId || !url) {
      throw new Error("Resposta da Didit sem session_id/url em POST /v3/session/.");
    }
    return { sessionId, url, status: normalizeStatus(body.status) };
  }

  /**
   * Busca o payload completo de decisão de uma sessão (`GET /v3/session/
   * {sessionId}/decision/`) — pull, complementar ao webhook. Existe
   * porque um evento aplicado manualmente no Business Console da Didit
   * (ex. um revisor recusando o usuário por lá) só chega à Rotta pelo
   * webhook SE o destino estiver configurado e a entrega não falhar;
   * este método é o que `IdentityVerificationService.refreshForAdmin`
   * usa como sincronização puxada, pra nunca deixar uma decisão da
   * Didit "presa" sem refletir na Rotta. Diferente do envelope do
   * webhook (que aninha os campos de verificação sob `event.decision`),
   * aqui eles já vêm direto na raiz do JSON.
   */
  async getSessionDecision(sessionId: string): Promise<DiditSessionDecision> {
    this.assertConfigured();
    const raw = await this.getJson(`/v3/session/${sessionId}/decision/`);
    return { sessionId, status: normalizeStatus(raw.status), raw };
  }

  /**
   * Aplica uma decisão manual sobre uma sessão (`PATCH /v3/session/
   * {sessionId}/update-status/`) — o que dá ao Admin Rotta o poder de
   * aprovar/recusar/pedir reenvio direto do painel, sem precisar abrir
   * o Business Console da Didit. A resposta só confirma `session_id`;
   * não traz a decisão atualizada — por isso `IdentityVerificationService.
   * decideForAdmin` sempre chama `getSessionDecision` logo em seguida
   * para persistir o estado já refletido do lado da Didit.
   */
  async updateSessionStatus(
    sessionId: string,
    newStatus: DiditManualStatus,
    comment?: string,
  ): Promise<void> {
    this.assertConfigured();
    await this.patchJson(`/v3/session/${sessionId}/update-status/`, {
      new_status: newStatus,
      ...(comment ? { comment } : {}),
    });
  }

  /**
   * `GET /v3/webhook/destinations/` — lista os destinos de webhook já
   * cadastrados na conta (API de gerenciamento, mesma família de
   * `/v3/webhook/destinations/`, diferente das APIs de verificação
   * usadas pelos demais métodos desta classe). Usado por
   * `DiditWebhookProvisioningService` para checar se já existe um
   * destino apontando para a nossa própria URL antes de criar outro —
   * nunca duplica. Formato de resposta tolerante de propósito (array
   * direto OU `{ results: [...] }`/`{ data: [...] }`): a documentação
   * completa deste endpoint específico não estava acessível no momento
   * em que este método foi escrito, então aceita as formas mais comuns
   * de paginação REST em vez de travar numa única suposição.
   */
  async listWebhookDestinations(): Promise<DiditWebhookDestination[]> {
    this.assertConfigured();
    const body: unknown = await this.getJson("/v3/webhook/destinations/");
    const rawList: unknown[] | null = Array.isArray(body)
      ? body
      : Array.isArray((body as { results?: unknown }).results)
        ? (body as { results: unknown[] }).results
        : Array.isArray((body as { data?: unknown }).data)
          ? (body as { data: unknown[] }).data
          : null;

    if (!rawList) {
      throw new Error(
        "Resposta da Didit em GET /v3/webhook/destinations/ não é uma lista reconhecida.",
      );
    }

    return rawList
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : "",
        url: typeof item.url === "string" ? item.url : "",
      }));
  }

  /**
   * `POST /v3/webhook/destinations/` — cadastra um novo destino de
   * webhook programaticamente (a alternativa por código do que hoje é
   * feito manualmente em Business Console → API & Webhooks → Add
   * destination). `secret_shared_key` só vem nesta resposta — a Didit
   * nunca o reexibe depois, nem em `listWebhookDestinations` nem no
   * próprio Business Console; perder essa resposta sem persistir o
   * segredo em algum lugar (`DiditWebhookProvisioningService` salva no
   * Redis) significa ter que apagar e recriar o destino.
   */
  async createWebhookDestination(
    url: string,
    subscribedEvents: string[],
    label: string,
  ): Promise<DiditCreatedWebhookDestination> {
    this.assertConfigured();
    const body = await this.postJson("/v3/webhook/destinations/", {
      label,
      url,
      webhook_version: "v3",
      subscribed_events: subscribedEvents,
    });

    const id = typeof body.id === "string" ? body.id : "";
    const secret = typeof body.secret_shared_key === "string" ? body.secret_shared_key : "";
    if (!secret) {
      throw new Error("Resposta da Didit em POST /v3/webhook/destinations/ sem secret_shared_key.");
    }
    return { id, secret };
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
    return this.send(path, {
      method: "POST",
      headers: { "x-api-key": this.config.apiKey! },
      body: form,
    });
  }

  /** Mesmo contrato de `post`, mas para `/v3/session/` — JSON puro, não `multipart/form-data`. */
  private async postJson(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.send(path, {
      method: "POST",
      headers: { "x-api-key": this.config.apiKey!, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  /** Mesmo contrato de `postJson`, mas para `GET /v3/session/{id}/decision/` — sem corpo. */
  private async getJson(path: string): Promise<Record<string, unknown>> {
    return this.send(path, {
      method: "GET",
      headers: { "x-api-key": this.config.apiKey! },
    });
  }

  /** Mesmo contrato de `postJson`, mas para `PATCH /v3/session/{id}/update-status/`. */
  private async patchJson(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.send(path, {
      method: "PATCH",
      headers: { "x-api-key": this.config.apiKey!, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  /** Núcleo compartilhado por `post`/`postJson`/`getJson`/`patchJson`: mede duração, registra em `IntegrationHealthService` e nunca deixa um corpo não-JSON virar um erro de parsing confuso. */
  private async send(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    const response = await fetch(`${this.config.baseUrl}${path}`, init);

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
