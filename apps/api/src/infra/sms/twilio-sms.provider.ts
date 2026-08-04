import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { SmsProvider, SmsSendInput, SmsSendResult } from "./sms-provider.interface";
import type { SmsConfig } from "@/config/sms.config";

/**
 * Provedor Twilio (briefing — "provedores de SMS") — chamada HTTP direta
 * (REST puro, sem SDK) contra a API de Messages da Twilio
 * (https://www.twilio.com/docs/sms/send-messages), autenticada via HTTP
 * Basic Auth (`AccountSid:AuthToken`) e corpo `application/x-www-form-
 * urlencoded`.
 */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";

  private readonly config: SmsConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<SmsConfig>("sms")!;
  }

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    if (!this.config.accountSid || !this.config.authToken || !this.config.fromNumber) {
      throw new ServiceUnavailableException(
        "SMS (Twilio) não configurado neste ambiente (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER ausentes).",
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const credenciais = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString(
      "base64",
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credenciais}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: input.to,
        From: this.config.fromNumber,
        Body: input.texto,
      }),
    });

    const rawBody = await response.text();
    const body = parseJsonSafely<{ sid?: string; message?: string }>(rawBody);

    if (!response.ok || !body?.sid) {
      throw new Error(
        `Falha ao enviar SMS via Twilio: ${body?.message ?? rawBody.slice(0, 200) ?? response.statusText}`,
      );
    }

    return { providerMessageId: body.sid };
  }
}

/** A API da Twilio sempre responde JSON, mas um proxy/gateway intermediário pode devolver HTML/texto — nunca deixe isso virar um erro de parsing confuso. */
function parseJsonSafely<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
