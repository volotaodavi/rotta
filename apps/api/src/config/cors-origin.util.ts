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

/**
 * Divide `CORS_ORIGINS` (lista separada por vírgula) em origens
 * comparáveis com o header `Origin` do navegador — extraído de
 * `app.config.ts` pelo mesmo motivo de `isCorsOriginAllowed` (testável
 * isoladamente). `Origin` NUNCA tem espaço nem barra no final (é sempre
 * `scheme://host[:port]`, sem path) — mas é fácil digitar `"a, b"`
 * (espaço depois da vírgula, jeito natural de digitar) ou colar uma URL
 * com `/` sobrando sem perceber, e `isCorsOriginAllowed` faz comparação
 * EXATA, que não perdoa nenhum dos dois (achado real: origem admin
 * "não batendo" mesmo já cadastrada, pedido do usuário 02/09/2026).
 */
export function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}
