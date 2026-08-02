/**
 * Utilitários de querystring/payload compartilhados por todos os
 * arquivos de `endpoints/*` — extraído de `endpoints/companies.ts`
 * quando o módulo Veículos precisou exatamente da mesma lógica, para
 * nunca duplicar (Dossiê 23, Secao 3.1).
 */

export function buildQueryString<T extends object>(params: T): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }
  const asString = query.toString();
  return asString ? `?${asString}` : "";
}

/**
 * Remove campos string opcionais vazios (`""`) do payload antes de enviar.
 * Os DTOs da API tratam campo opcional ausente como "não informado", mas
 * `@IsOptional()` do class-validator só pula a validação para
 * `undefined`/`null` — uma string vazia ainda cai no validador do campo
 * (ex. `@IsBrazilianPhone()` em `whatsapp`) e é rejeitada como inválida.
 */
export function omitEmptyOptionalStrings<T extends object>(input: T): T {
  const result = { ...input } as Record<string, unknown>;
  for (const [key, value] of Object.entries(result)) {
    if (value === "") {
      delete result[key];
    }
  }
  return result as T;
}
