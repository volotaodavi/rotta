import { Injectable, Logger } from "@nestjs/common";

import { EmailService } from "@/infra/email/email.service";
import { renderNotificationEmailHtml } from "@/infra/email/templates/notification-email.template";

/**
 * Envio do link de redefinição de senha (Dossiê 15, `AUTH-03`) —
 * mesmo canal/template já usado por `SupportService` (`EmailService` +
 * `renderNotificationEmailHtml`), nunca um provedor/HTML próprio.
 *
 * Best-effort de propósito (nunca lança): `AuthService.forgotPassword`
 * (`RN-AUTH-03`) sempre devolve a mesma resposta genérica pro cliente,
 * exista a conta ou não — se o e-mail falhar (chave ausente, Resend
 * fora do ar), a requisição não pode vazar essa diferença. Continua
 * logando o token em `warn` mesmo quando o e-mail sai: útil pra
 * destravar um teste manual em dev sem precisar de `EMAIL_API_KEY`.
 */
@Injectable()
export class PasswordResetNotifierService {
  private readonly logger = new Logger(PasswordResetNotifierService.name);

  constructor(private readonly emailService: EmailService) {}

  async notify(email: string, rawToken: string): Promise<void> {
    // `WEB_APP_URL` ausente (ex. ambiente sem essa variável configurada)
    // → ainda envia o e-mail, só sem link clicável (o token cru serve
    // pra colar manualmente na tela de redefinição, se precisar).
    const webAppUrl = process.env.WEB_APP_URL?.replace(/\/$/, "");
    const link = webAppUrl
      ? `${webAppUrl}/redefinir-senha?token=${encodeURIComponent(rawToken)}`
      : null;

    this.logger.warn(
      `Link de redefinição de senha para ${email}: token=${rawToken}${link ? ` (${link})` : ""}.`,
    );

    const corpo = link
      ? `Recebemos um pedido para redefinir sua senha na Rotta. Clique no link abaixo para escolher uma nova senha — se não foi você, ignore este e-mail.\n\n${link}\n\nEste link expira em breve.`
      : `Recebemos um pedido para redefinir sua senha na Rotta. Use o código abaixo na tela de redefinição de senha — se não foi você, ignore este e-mail.\n\nCódigo: ${rawToken}\n\nEste código expira em breve.`;

    try {
      await this.emailService.sendEmail(
        email,
        "Redefinição de senha — Rotta",
        renderNotificationEmailHtml({ titulo: "Redefinir senha", corpo }),
      );
    } catch (error) {
      // Nunca propaga — `AuthService.forgotPassword` já respondeu de
      // forma genérica antes ou depois disso não pode diferenciar
      // "e-mail existe mas o envio falhou" de "e-mail não existe".
      this.logger.warn(
        `Falha ao enviar e-mail de redefinição de senha para ${email}: ${(error as Error).message}`,
      );
    }
  }
}
