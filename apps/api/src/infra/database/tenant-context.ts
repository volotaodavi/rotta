import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexto de tenant da requisicao corrente (Dossie 8, Secao 15.2). Guardado
 * em `AsyncLocalStorage` (nao em variavel de instancia/estatica) porque
 * precisa ser isolado por requisicao HTTP mesmo com multiplas requisicoes
 * concorrentes compartilhando o mesmo processo Node — exatamente o
 * problema que uma variavel comum nao resolveria.
 *
 * `tenantId` e `null` apenas para `Role.ADMIN_ROTTA` (Dossie 8, Secao 2).
 * `bypass` e verdadeiro apenas quando o papel resolvido do JWT (nunca de
 * input do cliente) e `Role.ADMIN_ROTTA` — ver `TenantGuard`.
 */
export interface TenantContext {
  tenantId: string | null;
  bypass: boolean;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();
