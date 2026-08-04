import type { CommunicationChannel } from "@prisma/client";

/** Payload comum aos 5 processors de entrega (um por fila de `QUEUE_NAMES`). */
export interface ChannelDeliveryJobData {
  notificationId: string;
  deliveryAttemptId: string;
  canal: CommunicationChannel;
}
