const STORAGE_KEY = "rotta_current_company_id";

/**
 * Ponte TEMPORÁRIA para identificar a empresa (tenant) do usuário logado
 * em `apps/web`, usada apenas para permitir testar o módulo de Empresas
 * (Dossiê 16) contra a API real antes do módulo Auth (Dossiê 15) existir.
 *
 * **Substituída por completo** quando o Auth real for implementado —
 * ali a empresa corrente vem da sessão/JWT (`VinculoPapel` ativo), nunca
 * de um valor solto em `localStorage`. Nenhum código de produto deve
 * passar a depender desta função além do necessário para este módulo.
 */
export function getStoredCompanyId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredCompanyId(companyId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, companyId);
}

export function clearStoredCompanyId(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
