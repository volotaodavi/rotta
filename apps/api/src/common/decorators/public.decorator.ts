import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marca uma rota como publica (`[público]` no Dossie 13) — dispensa o
 * `JwtAuthGuard` (Dossie 12, Secao 5.1). Usado apenas nas rotas
 * explicitamente publicas do modulo Auth (login, cadastro, magic link) e
 * no health check.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
