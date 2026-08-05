import { registerAs } from "@nestjs/config";

export interface LytexConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  baseUrl: string | undefined;
}

/**
 * Configuração da Lytex (lytex.com.br) — provedora de pagamento
 * parceira escolhida para a Rotta Pay (Dossiê 26). `clientId`/
 * `clientSecret` foram fornecidos pelo usuário (par OAuth2 client
 * credentials), mas `baseUrl`/os endpoints reais de autenticação e
 * split de pagamento AINDA NÃO foram confirmados nesta base de código
 * — o ambiente de desenvolvimento não teve acesso de rede à
 * documentação da Lytex (docs.lytex.com.br) para validar o contrato
 * real da API. `RottaPayProviderService` por isso trata "credenciais
 * presentes" e "integração implementada" como dois estados
 * DIFERENTES — nunca finge que a segunda existe só porque a primeira
 * existe (mesmo princípio de honestidade de `DiditService`/
 * `AuthentiqueService`).
 */
export default registerAs("lytex", (): LytexConfig => ({
  clientId: process.env.LYTEX_CLIENT_ID || undefined,
  clientSecret: process.env.LYTEX_CLIENT_SECRET || undefined,
  baseUrl: process.env.LYTEX_BASE_URL || undefined,
}));
