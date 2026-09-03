import { Injectable, NotFoundException } from "@nestjs/common";
import { CommunicationChannel, NotificationEventType } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";
import type { EmailRemetente } from "@/infra/email/email-provider.interface";

import { EmailService } from "@/infra/email/email.service";
import { renderNotificationEmailHtml } from "@/infra/email/templates/notification-email.template";
import { UsersService } from "@/modules/users/users.service";


/**
 * Tipos financeiros (pedido do usuário 03/09/2026: "financeiro@...,
 * suporte@... quero colocar pra enviar e-mails com esses dois também")
 * — cobrança/plano/trial, sempre do ponto de vista de quem paga.
 */
const TIPOS_FINANCEIRO: ReadonlySet<NotificationEventType> = new Set([
  NotificationEventType.PAGAMENTO_APROVADO,
  NotificationEventType.PAGAMENTO_RECUSADO,
  NotificationEventType.PAGAMENTO_PENDENTE,
  NotificationEventType.TRIAL_EXPIRANDO,
  NotificationEventType.TRIAL_VENCE_HOJE,
  NotificationEventType.TRIAL_BLOQUEADO,
  NotificationEventType.PLANO_NOVA_ASSINATURA,
]);

/**
 * Tipos de suporte — só o par que já é a própria conversa de chamado
 * (`SUPORTE_TICKET_ABERTO`/`SUPORTE_NOVA_MENSAGEM` chegam aqui quando o
 * destinatário é o TENANT sendo avisado; a cópia pra caixa fixa da
 * Rotta já usa `"suporte"` direto em `SupportService`). Não inclui
 * `CONVERSA_NOVA_MENSAGEM` — é o chat Responsável↔Motorista/Monitor,
 * não a equipe de suporte da Rotta.
 */
const TIPOS_SUPORTE: ReadonlySet<NotificationEventType> = new Set([
  NotificationEventType.SUPORTE_TICKET_ABERTO,
  NotificationEventType.SUPORTE_NOVA_MENSAGEM,
]);

function resolveRemetente(tipo: NotificationEventType): EmailRemetente {
  if (TIPOS_FINANCEIRO.has(tipo)) return "financeiro";
  if (TIPOS_SUPORTE.has(tipo)) return "suporte";
  return "notificacoes";
}

/**
 * Canal `EMAIL` (briefing — "Criar serviço de envio de e-mails,
 * templates HTML responsivos, permitir múltiplos provedores") — envia
 * de verdade através do provedor ativo (`EmailService`, hoje a Resend),
 * sempre com o template HTML responsivo (`renderNotificationEmailHtml`).
 * Destino sempre `User.email`, remetente resolvido por `resolveRemetente`
 * a partir de `Notification.tipo` (financeiro/suporte/genérico). Substitui
 * definitivamente o log `[STUB]` avulso de `PasswordResetNotifierService`
 * quando esse fluxo migrar para o Communication Engine.
 */
@Injectable()
export class EmailChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.EMAIL;

  constructor(
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const user = await this.usersService.findById(input.notification.userId);
    if (!user) {
      throw new NotFoundException("Usuário do destinatário não encontrado.");
    }

    const html = renderNotificationEmailHtml({
      titulo: input.notification.titulo,
      corpo: input.notification.corpo,
    });

    await this.emailService.sendEmail(
      user.email,
      input.notification.titulo,
      html,
      resolveRemetente(input.notification.tipo),
    );

    return { provedor: "email", entregueImediatamente: false };
  }
}
