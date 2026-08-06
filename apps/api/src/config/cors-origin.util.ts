/**
 * Decide se uma origem de requisição (header `Origin` do navegador) pode
 * ser aceita pelo CORS — extraído de `main.ts` só para poder testar a
 * regra isoladamente (Dossiê 12, Seção 7.1: origem exata de
 * `CORS_ORIGINS` OU casamento com `CORS_ORIGIN_REGEX` opcional, usado
 * para Preview Deployments da Vercel).
 */
export function isCorsOriginAllowed(
  origin: string,
  allowedOrigins: string[],
  originRegex: RegExp | undefined,
): boolean {
  return allowedOrigins.includes(origin) || (originRegex?.test(origin) ?? false);
}
