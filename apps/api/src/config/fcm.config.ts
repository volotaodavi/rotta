import { registerAs } from "@nestjs/config";

export interface FcmConfig {
  projectId: string | undefined;
  clientEmail: string | undefined;
  privateKey: string | undefined;
}

/**
 * Configuração do Firebase Cloud Messaging (briefing "PUSH NOTIFICATION"
 * — https://firebase.google.com/docs/cloud-messaging). As 3 variáveis
 * vêm da Service Account do projeto Firebase (Console → Configurações
 * do projeto → Contas de serviço → Gerar nova chave privada) — todas
 * opcionais: sem elas, a aplicação sobe normalmente e `FcmService`
 * recusa o envio com um erro claro em vez de falhar o boot (mesmo
 * padrão de `storage.config.ts`/`SupabaseStorageService`).
 *
 * `FIREBASE_PRIVATE_KEY` costuma vir com `\n` escapado (variável de
 * ambiente de uma linha só) — convertido aqui para quebras de linha
 * reais antes de chegar ao `firebase-admin`, que exige o PEM formatado.
 */
export default registerAs("fcm", (): FcmConfig => ({
  projectId: process.env.FIREBASE_PROJECT_ID || undefined,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || undefined,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
}));
