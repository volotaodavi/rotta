import { timingSafeEqual } from "node:crypto";

import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import lytexConfig from "@/config/lytex.config";

/**
 * Defesa do webhook da Lytex.
 *
 * ## A Lytex não assina o corpo
 *
 * A documentação dela descreve o webhook em prosa ("cadastre a URL em
 * Configurações > Integrações > API e responda 200") e não menciona
 * assinatura, HMAC nem header de autenticação. Então a única barreira
 * possível é um segredo combinado por nós, e é o que isto confere.
 *
 * O valor vai em `LYTEX_WEBHOOK_TOKEN` e entra na URL cadastrada no
 * painel, como parâmetro de consulta, OU no header `x-rotta-webhook-token`
 * quando o painel permitir cabeçalho. Os dois são aceitos porque não há
 * documentação dizendo qual deles o painel oferece, e descobrir isso
 * custa uma cobrança perdida em produção.
 *
 * A rota é `@Public()`: a Lytex não tem um JWT da Rotta para mandar.
 * Este guard é a ÚNICA defesa real do endpoint.
 *
 * Comparação em tempo constante, como em `AsaasWebhookGuard` e
 * `DiditWebhookGuard`: `!==` em string vaza timing proporcional a
 * quantos caracteres batem antes da primeira diferença.
 */
@Injectable()
export class LytexWebhookGuard implements CanActivate {
  constructor(
    @Inject(lytexConfig.KEY)
    private readonly config: ConfigType<typeof lytexConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.webhookToken) {
      throw new UnauthorizedException(
        "LYTEX_WEBHOOK_TOKEN não configurado: webhook da Lytex desativado.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const doHeader = request.headers["x-rotta-webhook-token"];
    const daQuery = request.query?.token;

    const informado =
      typeof doHeader === "string" ? doHeader : typeof daQuery === "string" ? daQuery : null;

    if (!informado || !this.tokenConfere(informado)) {
      throw new UnauthorizedException("Token de webhook da Lytex inválido.");
    }

    return true;
  }

  private tokenConfere(informado: string): boolean {
    const esperado = Buffer.from(this.config.webhookToken!);
    const recebido = Buffer.from(informado);
    return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
  }
}
