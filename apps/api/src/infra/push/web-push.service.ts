import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";

import type { PushConfig } from "@/config/push.config";

/** Status HTTP que o próprio protocolo Web Push (RFC 8030) define como "esta inscrição nunca mais vai funcionar". */
const INVALID_SUBSCRIPTION_STATUS_CODES = new Set([404, 410]);

export interface WebPushResult {
  sucesso: string[];
  invalidos: string[];
}

/**
 * Web Push padrão (RFC 8030) via par de chaves VAPID gerado localmente
 * — decisão do usuário: "fazer tudo (móbile + web), porém pegando de
 * forma gratuita". Cada token de `DeviceToken.token` (plataforma
 * `WEB`) guarda o JSON de uma `PushSubscription` do navegador
 * (`endpoint` + `keys.p256dh`/`keys.auth`) — o navegador entrega via o
 * serviço de push nativo dele (Chrome/Firefox/Edge, todos gratuitos),
 * sem NENHUMA conta ou console externo envolvido.
 */
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly config: PushConfig;
  private vapidConfigured = false;

  constructor(configService: ConfigService) {
    this.config = configService.get<PushConfig>("push")!;
  }

  private ensureConfigured(): void {
    if (this.vapidConfigured) return;
    if (!this.config.vapidPublicKey || !this.config.vapidPrivateKey) {
      throw new ServiceUnavailableException(
        "Web Push não configurado neste ambiente (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes).",
      );
    }
    webpush.setVapidDetails(
      this.config.vapidSubject,
      this.config.vapidPublicKey,
      this.config.vapidPrivateKey,
    );
    this.vapidConfigured = true;
  }

  /** `tokens` aqui são o JSON serializado de cada `PushSubscription` (ver nota da classe). */
  async sendToTokens(
    tokens: string[],
    titulo: string,
    corpo: string,
    dados?: Record<string, unknown>,
  ): Promise<WebPushResult> {
    this.ensureConfigured();

    const sucesso: string[] = [];
    const invalidos: string[] = [];
    const payload = JSON.stringify({ titulo, corpo, dadosContexto: dados });

    await Promise.all(
      tokens.map(async (token) => {
        let subscription: webpush.PushSubscription;
        try {
          subscription = JSON.parse(token) as webpush.PushSubscription;
        } catch {
          this.logger.warn("Token WEB inválido (não é um JSON de PushSubscription) — descartado.");
          invalidos.push(token);
          return;
        }

        try {
          await webpush.sendNotification(subscription, payload);
          sucesso.push(token);
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode && INVALID_SUBSCRIPTION_STATUS_CODES.has(statusCode)) {
            invalidos.push(token);
          } else {
            this.logger.warn(
              `Falha ao entregar Web Push (HTTP ${statusCode ?? "desconhecido"}): ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      }),
    );

    return { sucesso, invalidos };
  }
}
