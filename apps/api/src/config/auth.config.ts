import { registerAs } from "@nestjs/config";

export interface AuthConfig {
  jwtPrivateKey: string;
  jwtPublicKey: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  mfaEncryptionKey: string | undefined;
}

/**
 * Variáveis de ambiente de uma única linha não suportam quebra de linha
 * real — `.env.example` documenta as chaves RS256 com `\n` literal
 * (2 caracteres) separando as linhas do PEM, convenção padrão para
 * armazenar chave assimétrica em variável de ambiente. Sem este
 * `replace`, `jsonwebtoken`/`crypto` rejeitam a chave ("must be an
 * asymmetric key") — bug real encontrado e corrigido durante o módulo
 * de Empresas, ao gerar o primeiro JWT de teste ponta a ponta.
 */
function normalizePemFromEnv(value: string): string {
  return value.replace(/\\n/g, "\n");
}

/**
 * Configuracao de autenticacao (Dossie 12, Secao 4) — JWT assinado com
 * par de chaves RS256, permitindo que outros servicos (ex.
 * apps/realtime-gateway) validem o token com a chave publica sem
 * consultar a Core API a cada conexao.
 */
export default registerAs("auth", (): AuthConfig => ({
  jwtPrivateKey: normalizePemFromEnv(process.env.JWT_PRIVATE_KEY ?? ""),
  jwtPublicKey: normalizePemFromEnv(process.env.JWT_PUBLIC_KEY ?? ""),
  accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? "30d",
  mfaEncryptionKey: process.env.MFA_ENCRYPTION_KEY,
}));
