import type { DeviceToken, DeviceTokenPlatform } from "@prisma/client";

export interface RegisterDeviceTokenData {
  userId: string;
  token: string;
  plataforma: DeviceTokenPlatform;
}

/**
 * `device_tokens` NÃO tem RLS (dado inteiramente pessoal do usuário, ver
 * nota de RLS na migration) — todo método usa `this.prisma` direto.
 */
export interface DeviceTokenRepository {
  /**
   * Cria ou RENOVA (briefing "PUSH NOTIFICATION" — "Implementar
   * renovação automática do token; se expirar, gerar novo
   * automaticamente") o registro de um token já conhecido: `token` é
   * `@unique`, então um upsert por `token` é o mecanismo natural de
   * renovação (o FCM emite um NOVO valor de token quando o antigo
   * expira — o dispositivo chama este método de novo com o valor
   * atualizado, nunca precisando saber se é criação ou renovação).
   */
  upsertByToken(data: RegisterDeviceTokenData): Promise<DeviceToken>;
  listActiveByUser(userId: string): Promise<DeviceToken[]>;
  deactivate(token: string): Promise<void>;
}
