import type { CommunicationChannel } from "@prisma/client";

/** Payload comum a todo job de entrega publicado via QStash para `NotificationDeliveryController`. */
export interface ChannelDeliveryJobData {
  notificationId: string;
  deliveryAttemptId: string;
  canal: CommunicationChannel;
}
