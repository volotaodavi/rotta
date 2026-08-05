import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Receiver } from "@upstash/qstash";

import type { QstashConfig } from "@/config/qstash.config";
import type { Request } from "express";

/**
 * Protege os endpoints `/internal/queue/*` — o único jeito de garantir
 * que quem chamou de fato foi o QStash (e não qualquer requisição
 * externa forjando um "job concluído") é verificar a assinatura
 * `Upstash-Signature` contra as chaves do projeto (Dossie 14). Estas
 * rotas são `@Public()` (não passam pelo `JwtStrategy` — o QStash não
 * tem um JWT de usuário para enviar), então este Guard é a ÚNICA
 * defesa: nunca registrar um endpoint `/internal/queue/*` sem ele.
 *
 * Exige `req.rawBody` (Buffer do corpo bruto, antes do parse JSON) —
 * a assinatura é calculada sobre os bytes exatos enviados, não sobre o
 * objeto já desserializado; ver `main.ts` (`bodyParser` com
 * `rawBody: true`).
 */
@Injectable()
export class QstashSignatureGuard implements CanActivate {
  private readonly receiver: Receiver | null;

  constructor(configService: ConfigService) {
    const config = configService.get<QstashConfig>("qstash")!;
    this.receiver =
      config.currentSigningKey && config.nextSigningKey
        ? new Receiver({
            currentSigningKey: config.currentSigningKey,
            nextSigningKey: config.nextSigningKey,
          })
        : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.receiver) {
      throw new UnauthorizedException(
        "QSTASH_CURRENT_SIGNING_KEY/QSTASH_NEXT_SIGNING_KEY não configurados — endpoints internos de fila desativados.",
      );
    }

    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.headers["upstash-signature"];
    if (typeof signature !== "string" || !request.rawBody) {
      throw new UnauthorizedException("Requisição sem assinatura QStash válida.");
    }

    const valido = await this.receiver
      .verify({ signature, body: request.rawBody.toString("utf8") })
      .catch(() => false);
    if (!valido) {
      throw new UnauthorizedException("Assinatura QStash inválida.");
    }

    return true;
  }
}
