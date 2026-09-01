import { Injectable, Logger } from "@nestjs/common";

import { EmailService } from "./email.service";
import { renderNotificationEmailHtml } from "./templates/notification-email.template";

/**
 * Sem `ADMIN_DIGEST_INBOX_EMAILS`, cai nestas duas — pedido do usuário
 * (01/09/2026: "o e-mail que está de admin na Rotta não existe (de
 * vdd)... direcionar essas informações pra contato@rottabr.com.br/
 * rottadobrasil@gmail.com"). Configurável (uma ou mais, separadas por
 * vírgula) pro dia em que uma caixa dedicada existir.
 */
const DEFAULT_ADMIN_DIGEST_INBOX_EMAILS = "contato@rottabr.com.br,rottadobrasil@gmail.com";

/**
 * Envia um informativo direto pra uma (ou mais) caixa(s) fixa(s) da
 * Rotta — não é um `User.email`, então nunca passa pelo Communication
 * Engine por usuário (mesmo raciocínio de `SUPPORT_INBOX_EMAIL` em
 * `SupportService`, agora extraído aqui pra ser reaproveitado pelos
 * outros informativos do Admin — novo cliente, nova assinatura,
 * chamado encerrado, resumo semanal/mensal). Complementa (nunca
 * substitui) a notificação in-app/push/e-mail pra cada `User` com
 * `isAdminRotta: true` — essa é a única via de PUSH (e-mail solto não
 * tem como acionar push), esta aqui é a garantia de que o e-mail chega
 * de verdade, mesmo que nenhuma conta Admin Rotta exista ainda ou
 * esteja com e-mail desatualizado.
 */
@Injectable()
export class AdminInboxEmailService {
  private readonly logger = new Logger(AdminInboxEmailService.name);

  constructor(private readonly emailService: EmailService) {}

  private resolveInboxes(): string[] {
    const raw = process.env.ADMIN_DIGEST_INBOX_EMAILS || DEFAULT_ADMIN_DIGEST_INBOX_EMAILS;
    return raw
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
  }

  /** Best-effort — nunca lança, nunca impede o fluxo principal que chamou. */
  async send(titulo: string, corpo: string): Promise<void> {
    const html = renderNotificationEmailHtml({ titulo, corpo });
    const inboxes = this.resolveInboxes();

    await Promise.all(
      inboxes.map((to) =>
        this.emailService.sendEmail(to, titulo, html).catch((error: unknown) => {
          this.logger.warn(
            `Falha ao enviar informativo "${titulo}" pra ${to}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }),
      ),
    );
  }
}
