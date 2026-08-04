import type { NotificationPreference } from "@prisma/client";

export interface UpsertNotificationPreferenceData {
  userId: string;
  receberPush?: boolean;
  receberWhatsapp?: boolean;
  receberSms?: boolean;
  receberEmail?: boolean;
  silenciarFinsDeSemana?: boolean;
  quietHoursInicio?: string | null;
  quietHoursFim?: string | null;
}

/** `notification_preferences` NÃO tem RLS (dado pessoal do usuário) — `this.prisma` direto. */
export interface NotificationPreferenceRepository {
  findByUser(userId: string): Promise<NotificationPreference | null>;
  upsert(data: UpsertNotificationPreferenceData): Promise<NotificationPreference>;
}
