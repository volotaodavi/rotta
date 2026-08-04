import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  WhatsAppProvider,
  WhatsAppSendInput,
  WhatsAppSendResult,
} from "./whatsapp-provider.interface";
import type { WhatsappConfig } from "@/config/whatsapp.config";

/**
 * Provedor oficial da Meta (briefing — "provedores oficiais") — WhatsApp
 * Cloud API, https://developers.facebook.com/docs/whatsapp/cloud-api.
 * Chamada HTTP direta (REST puro, sem SDK) porque a Cloud API não exige
 * um cliente especial — apenas `Authorization: Bearer <token>` e um JSON
 * no corpo, ao contrário do Firebase Admin SDK (push).
 *
 * LIMITAÇÃO REAL da API (não deste código): mensagem de texto livre só é
 * aceita dentro da "janela de atendimento" de 24h após a última mensagem
 * do cliente para o número da empresa — fora dessa janela, a Meta exige
 * uma "message template" pré-aprovada. Este provedor sempre envia texto
 * livre; o suporte a templates fica para quando o Communication Engine
 * precisar (ex. lembretes fora da janela de 24h) — declarar isso
 * honestamente aqui em vez de fingir que todo envio sempre funciona.
 */
@Injectable()
export class MetaCloudApiWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta-cloud-api";

  private readonly config: WhatsappConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<WhatsappConfig>("whatsapp")!;
  }

  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    if (!this.config.accessToken || !this.config.phoneNumberId) {
      throw new ServiceUnavailableException(
        "WhatsApp (Meta Cloud API) não configurado neste ambiente (WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID ausentes).",
      );
    }

    const url = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to.replace(/\D/g, ""),
        type: "text",
        text: { body: input.texto },
      }),
    });

    const rawBody = await response.text();
    const body = parseJsonSafely<{ messages?: { id: string }[]; error?: { message: string } }>(
      rawBody,
    );

    if (!response.ok || !body?.messages?.[0]) {
      throw new Error(
        `Falha ao enviar WhatsApp via Meta Cloud API: ${
          body?.error?.message ?? rawBody.slice(0, 200) ?? response.statusText
        }`,
      );
    }

    return { providerMessageId: body.messages[0].id };
  }
}

/** A Graph API sempre responde JSON, mas um proxy/gateway intermediário pode devolver HTML/texto — nunca deixe isso virar um erro de parsing confuso. */
function parseJsonSafely<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
