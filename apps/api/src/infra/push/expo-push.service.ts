import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { PushConfig } from "@/config/push.config";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
/** Limite documentado do próprio serviço do Expo por requisição. */
const MAX_TOKENS_PER_REQUEST = 100;
/** `details.error` que significam "este token nunca mais vai funcionar" — mesmo raciocínio de `FcmService.INVALID_TOKEN_ERROR_CODES`. */
const INVALID_TOKEN_ERRORS = new Set(["DeviceNotRegistered"]);

interface ExpoPushTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export interface ExpoPushResult {
  sucesso: string[];
  invalidos: string[];
}

/**
 * Serviço de push do próprio Expo (mobile — Android/iOS) — decisão do
 * usuário: "fazer tudo (móbile + web), porém pegando de forma
 * gratuita". Usa o `projectId` do EAS que o app já tem
 * (`app.config.ts`/`eas.json`) só do lado do dispositivo
 * (`getExpoPushTokenAsync`); este serviço nunca precisa dele — envia
 * pro endpoint público do Expo, que entrega via FCM (Android) ou APNs
 * (iOS) por trás, sem exigir nenhum arquivo do Firebase Console
 * (`google-services.json`) nem conta Apple Developer paga aqui.
 * `EXPO_ACCESS_TOKEN` é só um bônus de rate-limit, nunca obrigatório —
 * sem ele, o Expo aceita a requisição do mesmo jeito.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly config: PushConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<PushConfig>("push")!;
  }

  async sendToTokens(
    tokens: string[],
    titulo: string,
    corpo: string,
    dados?: Record<string, unknown>,
  ): Promise<ExpoPushResult> {
    const sucesso: string[] = [];
    const invalidos: string[] = [];

    for (let inicio = 0; inicio < tokens.length; inicio += MAX_TOKENS_PER_REQUEST) {
      const lote = tokens.slice(inicio, inicio + MAX_TOKENS_PER_REQUEST);
      const mensagens = lote.map((to) => ({ to, title: titulo, body: corpo, data: dados }));

      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(this.config.expoAccessToken
            ? { Authorization: `Bearer ${this.config.expoAccessToken}` }
            : {}),
        },
        body: JSON.stringify(mensagens),
      });

      if (!response.ok) {
        this.logger.warn(`Expo Push respondeu HTTP ${response.status} para um lote de ${lote.length} token(s).`);
        continue;
      }

      const payload = (await response.json()) as { data?: ExpoPushTicket[] };
      const tickets = payload.data ?? [];
      tickets.forEach((ticket, index) => {
        const token = lote[index]!;
        if (ticket.status === "ok") {
          sucesso.push(token);
        } else if (ticket.details?.error && INVALID_TOKEN_ERRORS.has(ticket.details.error)) {
          invalidos.push(token);
        } else {
          this.logger.warn(`Expo Push recusou o token ${token}: ${ticket.message ?? "erro desconhecido"}.`);
        }
      });
    }

    return { sucesso, invalidos };
  }
}
