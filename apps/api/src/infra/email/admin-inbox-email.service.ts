import { Injectable, Logger } from "@nestjs/common";

import { EmailService } from "./email.service";
import { renderNotificationEmailHtml } from "./templates/notification-email.template";

import type { EmailRemetente } from "./email-provider.interface";

/**
 * Destinatário fixo por categoria (pedido do usuário 07/09/2026: "vem
 * muito e-mail para o mesmo objetivo... financeiro@ → relatório
 * semanal e financeiro geral, contato@ → novo cliente e demais
 * informações, suporte@ → mensagens de suporte") — cada categoria de
 * `EmailRemetente` cai numa caixa fixa DIFERENTE, nunca todas na mesma
 * lista genérica (era o bug: um informativo com remetente "financeiro"
 * chegava em `contato@`/gmail, não em `financeiro@`, porque antes
 * existia uma única lista pra tudo). Configurável (uma ou mais
 * caixas, separadas por vírgula) por categoria — pro dia em que uma
 * caixa dedicada mudar ou precisar de mais de um destinatário.
 */
const DEFAULT_INBOX_EMAILS: Record<EmailRemetente, string> = {
  financeiro: "financeiro@rottabr.com.br",
  suporte: "suporte@rottabr.com.br",
  // "notificacoes" (genérico — novo cliente, avisos gerais) — pedido do
  // usuário 01/09/2026: "o e-mail que está de admin na Rotta não
  // existe (de vdd)... direcionar essas informações pra
  // contato@rottabr.com.br/rottadobrasil@gmail.com".
  notificacoes: "contato@rottabr.com.br,rottadobrasil@gmail.com",
};

const INBOX_ENV_VAR: Record<EmailRemetente, string> = {
  financeiro: "FINANCE_DIGEST_INBOX_EMAILS",
  suporte: "SUPPORT_DIGEST_INBOX_EMAILS",
  notificacoes: "ADMIN_DIGEST_INBOX_EMAILS",
};

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

  private resolveInboxes(remetente: EmailRemetente): string[] {
    const envVar = INBOX_ENV_VAR[remetente];
    const raw = process.env[envVar] || DEFAULT_INBOX_EMAILS[remetente];
    return raw
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
  }

  /**
   * Best-effort — nunca lança, nunca impede o fluxo principal que
   * chamou. `remetente` (default `"notificacoes"`) decide tanto o "De"
   * quanto o "Para" — ex. `BillingService`/`AdminDigestService` usam
   * `"financeiro"` (cai em `financeiro@`), `SupportService` usa
   * `"suporte"` (cai em `suporte@`).
   */
  async send(
    titulo: string,
    corpo: string,
    remetente: EmailRemetente = "notificacoes",
  ): Promise<void> {
    const html = renderNotificationEmailHtml({ titulo, corpo });
    const inboxes = this.resolveInboxes(remetente);

    await Promise.all(
      inboxes.map((to) =>
        this.emailService.sendEmail(to, titulo, html, remetente).catch((error: unknown) => {
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
