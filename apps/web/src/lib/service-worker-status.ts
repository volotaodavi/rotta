/**
 * `Boolean(navigator.serviceWorker?.controller)` — um Service Worker
 * ATIVO controlando a aba é, junto do `buildId` desatualizado, a
 * assinatura mais provável de um "Server Components render" sem
 * `digest`. Ver a nota completa em `ClientErrorReport` (schema.prisma).
 */
export function isServiceWorkerActive(): boolean {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  return Boolean(navigator.serviceWorker.controller);
}
