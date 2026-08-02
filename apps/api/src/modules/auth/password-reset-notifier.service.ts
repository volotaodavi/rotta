import { Injectable, Logger } from "@nestjs/common";

/**
 * Envio do link de redefinição de senha (Dossiê 15, `AUTH-03`).
 *
 * ESTADO ATUAL: stub — nenhum provedor de e-mail/SMS foi configurado
 * neste módulo (isso é infraestrutura do `NotificationsModule`, Dossiê
 * 14, ainda não implementada). Loga o token em nível `warn` (visível em
 * dev/staging, nunca deveria ir a um APM de produção sem redação) para
 * permitir testar o fluxo ponta a ponta manualmente. Trocar para um
 * envio real é, deliberadamente, uma mudança de UM único método nesta
 * classe — nenhum outro código do módulo Auth conhece o mecanismo de
 * entrega.
 */
@Injectable()
export class PasswordResetNotifierService {
  private readonly logger = new Logger(PasswordResetNotifierService.name);

  notify(email: string, rawToken: string): void {
    this.logger.warn(
      `[STUB] Link de redefinição de senha para ${email}: token=${rawToken} (envio real de e-mail pendente, Dossiê 14).`,
    );
  }
}
