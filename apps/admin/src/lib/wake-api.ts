"use client";

import { env } from "@/config/env";

// `NEXT_PUBLIC_API_URL` já inclui o prefixo `/v1` (ex.
// "https://rotta-vt7i.onrender.com/v1") — só falta o path do endpoint.
const WAKE_ENDPOINT = "/health";

/**
 * "Acorda" a API assim que a pessoa chega na tela de login do Admin —
 * mesmo raciocínio/mesma implementação de `apps/web/src/lib/wake-api.ts`
 * (pedido do usuário 03/09/2026), aplicado aqui porque o login do Admin
 * foi exatamente onde a espera de ~89s do cold-start do Render mais
 * doeu na madrugada de 02-03/09/2026 ("Erro inesperado ao entrar" —
 * investigado a fundo, a causa real era CORS, mas o cold-start
 * continua sendo um problema de latência separado que vale mitigar
 * aqui também). Nunca um ping 24/7 — só dispara com alguém realmente
 * chegando na tela.
 */
export function wakeApi(): void {
  if (typeof window === "undefined") return;
  fetch(`${env.NEXT_PUBLIC_API_URL}${WAKE_ENDPOINT}`, {
    method: "GET",
    keepalive: true,
  }).catch(() => {
    // Best-effort — nunca deixa a tela de login saber que isto existe.
  });
}
