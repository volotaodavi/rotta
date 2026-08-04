import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

import type { FcmConfig } from "@/config/fcm.config";

const FIREBASE_APP_NAME = "rotta-communication-engine";

/** Códigos de erro do FCM que significam "este token nunca mais vai funcionar" — ver `FcmService.sendToTokens`. */
const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export interface FcmSendResult {
  /** Tokens que receberam a mensagem com sucesso. */
  sucesso: string[];
  /**
   * Tokens que o FCM reportou como definitivamente inválidos (app
   * desinstalado, token nunca registrado, etc.) — o chamador deve
   * desativá-los (`DeviceTokenRepository.deactivate`) para nunca mais
   * tentar de novo; renovar é responsabilidade do próprio dispositivo
   * (briefing — "se expirar, gerar novo automaticamente"), que registra
   * o token novo via `DeviceTokenRepository.upsertByToken` na próxima
   * abertura do app.
   */
  invalidos: string[];
}

/**
 * Único ponto do sistema que conhece o Firebase Admin SDK (briefing
 * "PUSH NOTIFICATION" — Firebase Cloud Messaging). Constrói o app do
 * Firebase de forma preguiçosa (getter, não no construtor) para que a
 * aplicação suba normalmente mesmo sem `FIREBASE_PROJECT_ID`/
 * `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` configurados — mesmo
 * padrão de `SupabaseStorageService`.
 */
@Injectable()
export class FcmService {
  private readonly config: FcmConfig;
  private messaging: Messaging | null = null;

  constructor(configService: ConfigService) {
    this.config = configService.get<FcmConfig>("fcm")!;
  }

  private getMessagingClient(): Messaging {
    if (!this.config.projectId || !this.config.clientEmail || !this.config.privateKey) {
      throw new ServiceUnavailableException(
        "Push notification (FCM) não configurado neste ambiente (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY ausentes).",
      );
    }

    if (!this.messaging) {
      const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);
      const app =
        existing ??
        initializeApp(
          {
            credential: cert({
              projectId: this.config.projectId,
              clientEmail: this.config.clientEmail,
              privateKey: this.config.privateKey,
            }),
          },
          FIREBASE_APP_NAME,
        );
      this.messaging = getMessaging(app);
    }

    return this.messaging;
  }

  /** Envia a mesma notificação para vários tokens (fan-out — um usuário pode ter vários dispositivos ativos). */
  async sendToTokens(
    tokens: string[],
    titulo: string,
    corpo: string,
    dados?: Record<string, unknown>,
  ): Promise<FcmSendResult> {
    const messaging = this.getMessagingClient();

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: titulo, body: corpo },
      data: dados ? stringifyData(dados) : undefined,
    });

    const sucesso: string[] = [];
    const invalidos: string[] = [];
    response.responses.forEach((result, index) => {
      const token = tokens[index]!;
      if (result.success) {
        sucesso.push(token);
      } else if (result.error && INVALID_TOKEN_ERROR_CODES.has(result.error.code)) {
        invalidos.push(token);
      }
    });

    return { sucesso, invalidos };
  }
}

/** O payload `data` do FCM só aceita `Record<string, string>` — serializa valores não-string. */
function stringifyData(dados: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dados).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );
}
