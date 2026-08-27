import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import asaasConfig from "@/config/asaas.config";

/**
 * Defesa do webhook da Asaas (Dossiê 26) — mais simples que a da
 * AbacatePay (sem HMAC): a Asaas envia de volta, em todo evento, o
 * mesmo header `asaas-access-token` cadastrado como "Token de
 * autenticação" no dashboard dela ao criar o webhook
 * (`docs.asaas.com/docs/webhook` — token estático, não rotativo, sem
 * assinatura sobre o corpo). Comparado contra `ASAAS_WEBHOOK_TOKEN`
 * (valor escolhido por nós, colado também no dashboard).
 *
 * A rota é `@Public()` (sem JWT de usuário — a Asaas não tem um token
 * de usuário Rotta para enviar), então este Guard é a ÚNICA defesa
 * real deste endpoint — mesmo papel de `AbacatePayWebhookGuard`.
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

    if (providedToken !== this.config.webhookToken) {
      throw new UnauthorizedException("Token de webhook da Asaas inválido.");
    }

    return true;
  }
}
