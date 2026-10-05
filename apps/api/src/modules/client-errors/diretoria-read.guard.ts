import { timingSafeEqual } from "node:crypto";

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Request } from "express";

/** Cabeçalho que o turno de um diretor manda. */
const HEADER = "x-rotta-diretoria-token";

/**
 * Deixa a diretoria de agentes (ver `empresa/` na raiz do repositório)
 * LER os erros que acontecem na mão dos usuários, sem conta de admin e
 * sem acesso ao banco.
 *
 * Autorizado pelo fundador em 05/10/2026: "CTO poderá ver o app/web de
 * ponta a ponta, não só o backlog, mas tudo, pois o erro que der na
 * conta de um usuário, ele deverá saber desse erro e avaliar o que pode
 * ser feito. EU autorizo".
 *
 * Por que um segredo de cabeçalho e não uma conta de admin: um turno
 * agendado roda sozinho, sem ninguém para digitar senha, e guardar
 * usuário e senha de admin num agente seria dar a ele a plataforma
 * inteira. Este caminho dá exatamente uma coisa, só de leitura, e o
 * segredo vive só na variável de ambiente `DIRETORIA_READ_SECRET`,
 * nunca no repositório.
 *
 * Mesmas duas decisões do `TrackerIngestGuard`, pelas mesmas razões:
 *
 * 1. **Comparação em tempo constante**, porque segredo estático em
 *    endpoint público vaza aos poucos por diferença de tempo.
 * 2. **Sem segredo configurado, tudo recusado.** Nunca "passa livre":
 *    relatório de erro carrega caminho de tela e rastro de pilha do
 *    produto, e isso não fica aberto por falta de configuração.
 */
@Injectable()
export class DiretoriaReadGuard implements CanActivate {
  private readonly segredo: Buffer | null;

  constructor(configService: ConfigService) {
    const valor = configService.get<string>("DIRETORIA_READ_SECRET");
    this.segredo = valor ? Buffer.from(valor, "utf8") : null;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.segredo) {
      throw new UnauthorizedException(
        "DIRETORIA_READ_SECRET não configurado — leitura da diretoria desativada.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const recebido = request.headers[HEADER];
    if (typeof recebido !== "string" || recebido.length === 0) {
      throw new UnauthorizedException("Requisição sem token da diretoria.");
    }

    const informado = Buffer.from(recebido, "utf8");
    if (informado.length !== this.segredo.length || !timingSafeEqual(informado, this.segredo)) {
      throw new UnauthorizedException("Token da diretoria inválido.");
    }

    return true;
  }
}
