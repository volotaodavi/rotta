import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EmailProvider, EmailSendInput, EmailSendResult } from "./email-provider.interface";
import type { EmailConfig } from "@/config/email.config";

/**
 * Provedor Resend (briefing — "permitir múltiplos provedores") —
 * chamada HTTP direta (REST puro, sem SDK) contra
 * https://resend.com/docs/api-reference/emails/send-email, autenticada
 * via `Authorization: Bearer <api_key>`.
 */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  private readonly config: EmailConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<EmailConfig>("email")!;
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException(
        "E-mail (Resend) não configurado neste ambiente (EMAIL_API_KEY ausente).",
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${this.config.fromName} <${this.config.fromAddress}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });

    const rawBody = await response.text();
    const body = parseJsonSafely<{ id?: string; message?: string }>(rawBody);

    if (!response.ok || !body?.id) {
      throw new Error(
        `Falha ao enviar e-mail via Resend: ${body?.message ?? rawBody.slice(0, 200) ?? response.statusText}`,
      );
    }

    return { providerMessageId: body.id };
  }
}

/** A API da Resend sempre responde JSON, mas um proxy/gateway intermediário pode devolver HTML/texto — nunca deixe isso virar um erro de parsing confuso. */
function parseJsonSafely<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
