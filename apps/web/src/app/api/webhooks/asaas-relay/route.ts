import { after, NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { env } from "@/config/env";


/**
 * Relay "sempre acordado" pro webhook da Asaas (pedido do usuário
 * 03/09/2026: "como fazer o webhook do Asaas não expirar, sem gastar
 * um real com o plano pago... algo que não faça o Render dormir").
 *
 * Não existe forma de o plano free do Render nunca dormir sem pagar —
 * mas descobri, conferindo a documentação oficial da própria Asaas
 * (docs.asaas.com/docs/erro-read-timed-out e .../penalização-de-filas),
 * que o risco real é mais específico e contornável de graça:
 * - A Asaas espera só 10s pela resposta antes de contar como falha.
 * - Ela RE-TENTA sozinha (imediato, 30s, 1min, 3.5min, 5min... até
 *   2-3h), mas depois de 15 FALHAS CONSECUTIVAS **interrompe a fila
 *   inteira daquele webhook** até reativação manual — o risco de
 *   verdade não é "1 evento perdido", é "parar de receber qualquer
 *   evento novo até alguém notar e reativar".
 * - A própria Asaas permite até 10 webhooks/conta, e MAIS DE UM pode
 *   escutar o MESMO evento (docs.asaas.com/docs/sobre-os-webhooks).
 *
 * Este endpoint roda na Vercel — nunca "dorme" como o serviço free do
 * Render — e deve ser cadastrado como um SEGUNDO webhook no painel da
 * Asaas, apontando pro MESMO conjunto de eventos, SEM remover o
 * endpoint direto da API no Render (os dois continuam ativos). Como
 * este aqui responde 200 quase instantaneamente sempre, a fila DELE
 * nunca acumula falha nenhuma — o "contador de 15" do endpoint do
 * Render pode até falhar em algum cold-start isolado, mas nunca fica
 * sozinho sendo a única via de entrega.
 *
 * `after()` (Next.js 15, estável — Dossiê 23) roda o repasse pro
 * Render DEPOIS da resposta já ter sido mandada pra Asaas — nunca
 * atrasa o "200 OK" que ela está esperando. Entrega "at least once" já
 * é o próprio modelo da Asaas (ela pode reentregar o mesmo evento mais
 * de uma vez, inclusive nos dois webhooks); `AsaasWebhookController`/
 * `BillingService.handleAsaasWebhookEvent` já são idempotentes (só
 * reescrevem o mesmo status, nunca duplicam notificação nem cobrança),
 * então processar o mesmo evento duas vezes (uma vinda direto da
 * Asaas, outra repassada por aqui) nunca duplica efeito nenhum.
 *
 * Nunca lê/valida o header `asaas-access-token` aqui — só repassa
 * headers/corpo sem tocar; quem valida de verdade continua sendo o
 * `AsaasWebhookGuard` do lado da API. Evita duplicar o segredo
 * `ASAAS_WEBHOOK_TOKEN` numa segunda superfície (a Vercel nem precisa
 * conhecê-lo).
 */
// Teto pedido pra execução em segundo plano do `after()` abaixo — sem
// isso, o plano Hobby da Vercel corta em 10s por padrão, bem menos que
// o pior cold-start já medido do Render (~89s). A Vercel aplica o
// teto real do plano de qualquer forma (nunca falha por pedir mais).
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const token = request.headers.get("asaas-access-token") ?? "";

  after(async () => {
    try {
      await fetch(`${env.NEXT_PUBLIC_API_URL}/webhooks/asaas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": token,
        },
        body,
      });
    } catch {
      // Best-effort — a Asaas segue reentregando o mesmo evento direto
      // pro Render em paralelo (webhook primário continua cadastrado),
      // então uma falha aqui nunca é a única chance de o evento chegar.
    }
  });

  return NextResponse.json({ ok: true });
}
