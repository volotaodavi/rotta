/**
 * Consentimento de cookies (LGPD, art. 7º/8º — coleta de dados por
 * cookie de terceiro exige consentimento prévio e específico do
 * titular). Guardado em `localStorage` (não `sessionStorage`): uma
 * decisão de consentimento deve valer entre visitas, não só dentro da
 * mesma sessão — pedir de novo a cada aba nova seria mais irritante
 * que informativo, e não é isso que a lei pede (consentimento
 * "específico", não "repetido a cada visita").
 *
 * Só existem 3 estados possíveis — nunca um "meio aceito": até a
 * pessoa decidir, nenhum cookie de terceiro roda (`GoogleAnalytics`
 * fica desligado por padrão, ver `components/google-analytics.tsx`).
 */
export type CookieConsentStatus = "accepted" | "rejected" | null;

const STORAGE_KEY = "rotta-cookie-consent";
/** Nome do evento customizado disparado sempre que a decisão muda — permite que `GoogleAnalytics` (montado em outro ponto da árvore) reaja sem precisar de um Context/Provider só pra isso. */
const CHANGE_EVENT = "rotta-cookie-consent-changed";

export function getCookieConsent(): CookieConsentStatus {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function setCookieConsent(status: Exclude<CookieConsentStatus, null>): void {
  window.localStorage.setItem(STORAGE_KEY, status);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Assina mudanças de consentimento — devolve a função de cleanup (padrão de `useEffect`). */
export function subscribeCookieConsent(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // outra aba mudou a decisão
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
