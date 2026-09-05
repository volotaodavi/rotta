import { timingSafeEqual } from "node:crypto";

import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import asaasConfig from "@/config/asaas.config";

/**
 * Defesa do webhook da Asaas (Dossiê 26) — sem HMAC: a Asaas envia de
 * volta, em todo evento, o mesmo header `asaas-access-token` cadastrado
 * como "Token de autenticação" no dashboard dela ao criar o webhook
 * (`docs.asaas.com/docs/webhook` — token estático, não rotativo, sem
 * assinatura sobre o corpo). Comparado contra `ASAAS_WEBHOOK_TOKEN`
 * (valor escolhido por nós, colado também no dashboard).
 *
 * A rota é `@Public()` (sem JWT de usuário — a Asaas não tem um token
 * de usuário Rotta para enviar), então este Guard é a ÚNICA defesa
 * real deste endpoint.
 *
 * Comparação em tempo constante (achado em auditoria de segurança
 * 02/09/2026) — `!==` normal em string vaza timing proporcional a
 * quantos caracteres batem antes da primeira diferença; `timingSafeEqual`
 * (mesmo padrão já usado em `DiditWebhookGuard`) fecha esse canal,
 * mesmo sendo um token estático (não HMAC).
 */
@Injectable()
export class AsaasWebhookGuard implements CanActivate {
  constructor(
    @Inject(asaasConfig.KEY)
    private readonly config: ConfigType<typeof asaasConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.webhookToken) {
      throw new UnauthorizedException(
        "ASAAS_WEBHOOK_TOKEN não configurado — webhook da Asaas desativado.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = request.headers["asaas-access-token"];

    if (typeof providedToken !== "string" || !this.isValidToken(providedToken)) {
      throw new UnauthorizedException("Token de webhook da Asaas inválido.");
    }

    return true;
  }

  private isValidToken(providedToken: string): boolean {
    const expectedBuffer = Buffer.from(this.config.webhookToken!);
    const providedBuffer = Buffer.from(providedToken);
    return (
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer)
    );
  }
}
