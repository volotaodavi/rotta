import { createHmac, timingSafeEqual } from "node:crypto";

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { WEBHOOK_SECRET_KEY } from "./didit-webhook-provisioning.service";

import type { DiditConfig } from "@/config/didit.config";
import type { Request } from "express";

import { RedisService } from "@/infra/cache/redis.service";

/** A Didit rejeita qualquer entrega com `X-Timestamp` fora dessa janela (Didit docs — "reject if abs(now - X-Timestamp) > 300"), defesa contra replay. */
const MAX_TIMESTAMP_SKEW_SECONDS = 300;

/**
 * Reproduz a normalização de float da Didit antes de assinar: um float
 * de valor inteiro (`100.0`) é serializado como inteiro (`100`) do lado
 * dela — sem este passo, `JSON.stringify` do lado de cá nunca bateria
 * byte a byte com o canônico dela para esse caso. Nunca aparece hoje nos
 * campos que a Rotta lê (`webhook_type`/`session_id`/`status`/etc, todos
 * string/int/uuid), mas reproduzir o algoritmo completo (não uma versão
 * simplificada) é o que garante a assinatura bater em QUALQUER payload
 * futuro, não só nos campos que usamos agora.
 */
function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        shortenFloats(value),
      ]),
    );
  }
  if (typeof data === "number" && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

/** Ordena chaves recursivamente antes de re-serializar — a Didit assina com `sort_keys=True`, então a ordem de inserção do `JSON.parse` do Express precisa ser desfeita. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Protege `POST /webhooks/didit` — a Didit exige pelo menos um destino
 * de webhook cadastrado para liberar a aplicação (Business Console →
 * API & Webhooks → Add destination), mesmo quando `DiditService` usa só
 * as APIs standalone síncronas (sem sessão). Este Guard é a ÚNICA
 * defesa da rota (`@Public()`, sem JWT — a Didit não tem token de
 * usuário Rotta), mesmo papel de `QstashSignatureGuard`/`AbacatePayWebhookGuard`.
 *
 * Verifica `X-Signature-V2` (o algoritmo RECOMENDADO pela própria
 * Didit — https://docs.didit.me/integration/webhooks §"Why three
 * variants?"): HMAC-SHA256 sobre a forma canônica do JSON (chaves
 * ordenadas, separadores compactos, Unicode não escapado) — funciona
 * mesmo que o `express.json()`/body-parser do Nest re-serialize o corpo
 * de um jeito diferente do que a Didit enviou originalmente (diferente
 * da variante legada `X-Signature`, que assina os bytes brutos exatos e
 * quebraria com qualquer re-encoding). `X-Timestamp` (janela de 5min)
 * bloqueia replay.
 */
@Injectable()
export class DiditWebhookGuard implements CanActivate {
  private readonly config: DiditConfig;

  constructor(
    configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.config = configService.get<DiditConfig>("didit")!;
  }

  /**
   * `DIDIT_WEBHOOK_SECRET` (env var, setado à mão) tem prioridade — o
   * Redis (`DiditWebhookProvisioningService`) é só o fallback de quando
   * ninguém setou a variável explicitamente.
   */
  private async resolveWebhookSecret(): Promise<string | undefined> {
    if (this.config.webhookSecret) return this.config.webhookSecret;
    return (await this.redis.get<string>(WEBHOOK_SECRET_KEY)) ?? undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const webhookSecret = await this.resolveWebhookSecret();
    if (!webhookSecret) {
      throw new UnauthorizedException(
        "Nenhum segredo de webhook da Didit configurado (DIDIT_WEBHOOK_SECRET nem auto-registrado) — webhook desativado.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();

    const timestampHeader = request.headers["x-timestamp"];
    const signature = request.headers["x-signature-v2"];
    if (typeof timestampHeader !== "string" || typeof signature !== "string") {
      throw new UnauthorizedException("Requisição sem X-Timestamp/X-Signature-V2 válidos.");
    }

    const timestamp = Number.parseInt(timestampHeader, 10);
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(Math.floor(Date.now() / 1000) - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS
    ) {
      throw new UnauthorizedException("X-Timestamp fora da janela válida (possível replay).");
    }

    const canonical = JSON.stringify(sortKeys(shortenFloats(request.body)));
    const expected = createHmac("sha256", webhookSecret).update(canonical, "utf8").digest("hex");

    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(signature, "utf8");
    const valid =
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer);

    if (!valid) {
      throw new UnauthorizedException("Assinatura X-Signature-V2 inválida.");
    }

    return true;
  }
}
