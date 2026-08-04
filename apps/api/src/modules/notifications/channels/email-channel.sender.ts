import { Injectable, NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

import { EmailService } from "@/infra/email/email.service";
import { renderNotificationEmailHtml } from "@/infra/email/templates/notification-email.template";
import { UsersService } from "@/modules/users/users.service";


/**
 * Canal `EMAIL` (briefing — "Criar serviço de envio de e-mails,
 * templates HTML responsivos, permitir múltiplos provedores") — envia
 * de verdade através do provedor ativo (`EmailService`, hoje a Resend),
 * sempre com o template HTML responsivo (`renderNotificationEmailHtml`).
 * Destino sempre `User.email`. Substitui definitivamente o log `[STUB]`
 * avulso de `PasswordResetNotifierService` quando esse fluxo migrar para
 * o Communication Engine.
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

    await this.emailService.sendEmail(user.email, input.notification.titulo, html);

    return { provedor: "email", entregueImediatamente: false };
  }
}
