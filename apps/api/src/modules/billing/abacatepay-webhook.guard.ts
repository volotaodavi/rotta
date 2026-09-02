import { createHmac, timingSafeEqual } from "node:crypto";

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";


import { ABACATEPAY_HMAC_PUBLIC_KEY } from "./billing.constants";

import type { Request } from "express";

import abacatepayConfig from "@/config/abacatepay.config";

/**
 * Duas camadas de defesa, ambas documentadas pela própria AbacatePay
 * (Dossiê 26 — `docs.abacatepay.com/pages/webhooks`):
 *
 * 1. `?webhookSecret=...` na URL registrada no dashboard dela —
 *    comparado contra `ABACATEPAY_WEBHOOK_SECRET` (valor escolhido por
 *    nós, colado também no campo "Secret" do dashboard).
 * 2. `X-Webhook-Signature` — HMAC-SHA256 sobre o corpo bruto,
 *    verificado contra uma chave pública FIXA documentada pela
 *    AbacatePay (não é segredo por conta — a mesma constante vale para
 *    todos os clientes dela; ver `ABACATEPAY_HMAC_PUBLIC_KEY`).
 *
 * A rota é `@Public()` (sem JWT de usuário — a AbacatePay não tem um
 * token de usuário Rotta para enviar), então este Guard é a ÚNICA
 * defesa real deste endpoint — mesmo papel de `QstashSignatureGuard`.
 */
@Injectable()
export class AbacatePayWebhookGuard implements CanActivate {
  constructor(
    @Inject(abacatepayConfig.KEY)
    private readonly config: ConfigType<typeof abacatepayConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.webhookSecret) {
      throw new UnauthorizedException(
        "ABACATEPAY_WEBHOOK_SECRET não configurado — webhook da AbacatePay desativado.",
      );
    }

    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();

    // Comparação em tempo constante (achado em auditoria de segurança
    // 02/09/2026, mesmo motivo de `AsaasWebhookGuard`) — defesa em
    // profundidade: a assinatura HMAC abaixo é a defesa criptográfica
    // real, mas não custa nada fechar o canal de timing aqui também.
    const providedSecret = request.query.webhookSecret;
    if (typeof providedSecret !== "string" || !this.isValidSecret(providedSecret)) {
      throw new UnauthorizedException("Webhook secret inválido.");
    }

    const signature = request.headers["x-webhook-signature"];
    if (typeof signature !== "string" || !request.rawBody) {
      throw new UnauthorizedException("Requisição sem assinatura HMAC válida.");
    }

    const expected = createHmac("sha256", ABACATEPAY_HMAC_PUBLIC_KEY)
      .update(request.rawBody)
      .digest("base64");

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(signature);
    const valid =
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer);

    if (!valid) {
      throw new UnauthorizedException("Assinatura HMAC inválida.");
    }

    return true;
  }

  private isValidSecret(providedSecret: string): boolean {
    const expectedBuffer = Buffer.from(this.config.webhookSecret!);
    const providedBuffer = Buffer.from(providedSecret);
    return (
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer)
    );
  }
}
