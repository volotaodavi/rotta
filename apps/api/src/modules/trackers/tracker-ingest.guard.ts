import { timingSafeEqual } from "node:crypto";

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { TrackersConfig } from "@/config/trackers.config";
import type { Request } from "express";

/** Cabeçalho que o Traccar manda via `forward.header`. */
const HEADER = "x-rotta-tracker-token";

/**
 * Autentica o receptor de rastreadores (Traccar) que encaminha posições
 * para a API.
 *
 * Mesmo lugar do `QstashSignatureGuard` — máquina falando com máquina,
 * sem usuário — mas com um mecanismo mais fraco, e é importante que
 * esteja escrito: o QStash ASSINA o corpo (HMAC), o que prova origem e
 * integridade. O Traccar não assina nada; ele só sabe mandar um
 * cabeçalho fixo. Então aqui a prova é só "quem mandou conhece o
 * segredo".
 *
 * Duas decisões que vêm disso:
 *
 * 1. **Comparação em tempo constante.** Um `===` vazaria o segredo aos
 *    poucos por diferença de tempo de resposta. Com um segredo estático
 *    e um endpoint público, isso é explorável de verdade.
 * 2. **Sem segredo configurado = tudo recusado.** Não "passa livre".
 *    Aceitar posição de origem desconhecida seria pior do que não
 *    aceitar nenhuma: um ônibus errado no mapa é informação falsa para
 *    uma família.
 */
@Injectable()
export class TrackerIngestGuard implements CanActivate {
  private readonly segredo: Buffer | null;

  constructor(configService: ConfigService) {
    const config = configService.get<TrackersConfig>("trackers");
    this.segredo = config?.ingestSecret ? Buffer.from(config.ingestSecret, "utf8") : null;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.segredo) {
      throw new UnauthorizedException(
        "TRACKER_INGEST_SECRET não configurado — ingestão de rastreadores desativada.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const recebido = request.headers[HEADER];
    if (typeof recebido !== "string" || recebido.length === 0) {
      throw new UnauthorizedException("Requisição sem token de rastreador.");
    }

    const informado = Buffer.from(recebido, "utf8");
    // `timingSafeEqual` estoura se os tamanhos diferem, então o tamanho
    // é comparado antes — e um tamanho diferente já é recusa, sem
    // vazamento, porque o comprimento do segredo não é o segredo.
    if (informado.length !== this.segredo.length || !timingSafeEqual(informado, this.segredo)) {
      throw new UnauthorizedException("Token de rastreador inválido.");
    }

    return true;
  }
}
