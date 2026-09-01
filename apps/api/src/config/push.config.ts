import { registerAs } from "@nestjs/config";

export interface PushConfig {
  /** Chave pública VAPID (Web Push, RFC 8030) — também precisa estar em `NEXT_PUBLIC_VAPID_PUBLIC_KEY` do lado do cliente. */
  vapidPublicKey: string | undefined;
  vapidPrivateKey: string | undefined;
  /** `mailto:` exigido pelo protocolo Web Push — identifica quem enviou, sem vínculo com nenhuma conta externa. */
  vapidSubject: string;
  /** Opcional — melhora rate-limit do serviço de push do Expo, nunca obrigatório (Expo aceita requisições anônimas). */
  expoAccessToken: string | undefined;
}

/**
 * Push real, mobile (Expo) + web (VAPID) — decisão do usuário: "fazer
 * tudo (móbile + web), porém pegando de forma gratuita", sem depender
 * de nenhum console externo (Firebase incluso). O par de chaves VAPID
 * é gerado localmente uma única vez (`web-push.generateVAPIDKeys()`,
 * operação criptográfica pura, sem cadastro em lugar nenhum) e colado
 * aqui — mesmo espírito de `fcm.config.ts`: sem as variáveis, os
 * serviços (`ExpoPushService`/`WebPushService`) recusam o envio com um
 * erro claro em vez de fingir sucesso.
 */
export default registerAs("push", (): PushConfig => ({
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || undefined,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || undefined,
  vapidSubject: process.env.VAPID_SUBJECT || "mailto:contato@rottabr.com.br",
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
}));
