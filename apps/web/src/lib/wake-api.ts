"use client";

import { env } from "@/config/env";

// `NEXT_PUBLIC_API_URL` já inclui o prefixo `/v1` (ex.
// "https://rotta-vt7i.onrender.com/v1") — só falta o path do endpoint.
const WAKE_ENDPOINT = "/health";

/**
 * "Acorda" a API assim que a pessoa entra na Landing Page — pedido do
 * usuário 03/09/2026 ("algo que deixe ele acordado, ao descobrir que
 * tem alguém logado ou pretende logar... isso deverá acontecer quando
 * alguém entrar na Landing Page"), depois de medir na madrugada anterior
 * que a API no plano free do Render leva ~89s pra sair do zero
 * ("cold start") — tempo real que já causou um webhook real da Asaas
 * expirar por timeout (`ACCESS_TOKEN_CREATED`, "sua aplicação não
 * retornou a resposta no tempo esperado").
 *
 * Deliberadamente NÃO é um ping artificial 24/7 (aquilo consumiria
 * quase toda a cota gratuita de 750h/mês do Render à toa, mesmo de
 * madrugada sem visitante nenhum): só dispara com tráfego REAL — a
 * pessoa já estava vindo pro site de qualquer forma. Enquanto ela lê a
 * hero/rola a página (geralmente uns bons segundos antes de clicar em
 * "Entrar"/"Começar agora"), a API já está acordando escondida por
 * trás disso — quando ela finalmente precisar da API de verdade, boa
 * parte (ou toda) a espera do cold-start já foi absorvida.
 *
 * `keepalive: true` — sobrevive mesmo que a pessoa saia da página
 * rapidamente (ex. clicou em "Entrar" antes do `fetch` terminar); sem
 * corpo, então não bate no limite de ~64KB do `keepalive`. Erro/timeout
 * aqui nunca deve aparecer pra ninguém — é só uma otimização de
 * latência, o próprio fluxo real de login/checkout já trata a API
 * lenta/fora do ar normalmente.
 */
export function wakeApi(): void {
  if (typeof window === "undefined") return;
  fetch(`${env.NEXT_PUBLIC_API_URL}${WAKE_ENDPOINT}`, {
    method: "GET",
    keepalive: true,
  }).catch(() => {
    // Best-effort — nunca deixa a Landing Page saber que isto existe.
  });
}
