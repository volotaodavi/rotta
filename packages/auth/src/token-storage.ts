const STORAGE_KEY = "rotta_access_token";

/**
 * Ponte TEMPORÁRIA de armazenamento de token, usada apenas para permitir
 * testar manualmente módulos de negócio (ex. Empresas, Dossiê 16) contra
 * a API real antes do módulo Auth (Dossiê 15) existir.
 *
 * **Substituída por completo** quando o Auth real for implementado —
 * ali o token de acesso passa a viver em memória (nunca em
 * `localStorage`, vulnerável a XSS) e o refresh token em cookie
 * httpOnly (Dossiê 12, Secao 4.6). Nenhum código de produto deve passar
 * a depender desta função além do necessário para este módulo.
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
