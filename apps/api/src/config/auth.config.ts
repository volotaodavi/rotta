import { registerAs } from "@nestjs/config";

export interface AuthConfig {
  jwtPrivateKey: string;
  jwtPublicKey: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
}

/**
 * Configuracao de autenticacao (Dossie 12, Secao 4) — JWT assinado com
 * par de chaves RS256, permitindo que outros servicos (ex.
 * apps/realtime-gateway) validem o token com a chave publica sem
 * consultar a Core API a cada conexao.
 */
export default registerAs(
  "auth",
  (): AuthConfig => ({
    jwtPrivateKey: process.env.JWT_PRIVATE_KEY ?? "",
    jwtPublicKey: process.env.JWT_PUBLIC_KEY ?? "",
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? "15m",
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? "30d",
  }),
);
