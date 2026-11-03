import { expect, test } from "@playwright/test";

import { entrarComo } from "./ajudantes";

/**
 * Um passeio pelo produto, para gravar em vídeo.
 *
 * ## O que isto é, e o que NÃO é
 *
 * Não é teste de regressão: é um roteiro de demonstração, e por isso o
 * número `90` o deixa por último e separado dos cinco fluxos que, se
 * quebrarem, param o negócio.
 *
 * Ele afirma pouco de propósito — só que cada tela ABRIU e que o dado
 * semeado apareceu. Afirmar mais aqui transformaria um roteiro em
 * suíte paralela, com a manutenção de uma e o valor de nenhuma.
 *
 * ## Depende do seed de demonstração
 *
 * `prisma/seed-demonstracao.ts` precisa ter rodado: ele cria a escola,
 * a aluna Sofia, a rota de Itaipuaçu com três paradas e uma viagem
 * EM_ANDAMENTO com rastro de GPS. Sem ele as telas abrem vazias — o
 * produto está certo, e não há o que mostrar.
 */

// As telas do painel nao usam <h1>: a primeira versao deste roteiro
// esperava por um e falhava nas seis telas. Erro do roteiro, nao do
// produto -- aqui a espera e pela rede parar, e a afirmacao e sobre o
// DADO semeado aparecer, que e o que importa numa demonstracao.
//
// E a segunda versao esperava por `networkidle`, que NUNCA acontece
// aqui: o painel faz polling (o mapa da frota refaz a busca a cada 60s,
// o pulso da plataforma a cada 20s). Rede parada nao e um estado que
// este produto alcanca, entao esperar por ela e esperar para sempre.
const DEMORA = { timeout: 30_000 };

test.describe("passeio de demonstração", () => {
  test("a transportadora vê frota, rotas, alunos e o mapa", async ({ page }) => {
    await entrarComo(page, "empresa", /\/empresa/);

    // O mapa da frota: é onde a van aparece com a última posição que
    // mandou, e é a tela que mais distingue o produto.
    await page.goto("/veiculos/mapa");
    await page.waitForTimeout(4_000);

    await page.goto("/rotas");
    await expect(page.getByText("Rota Itaipuaçu", { exact: false })).toBeVisible(DEMORA);
    await page.waitForTimeout(2_000);

    await page.goto("/alunos");
    await expect(page.getByText("Sofia Almeida", { exact: false })).toBeVisible(DEMORA);
    await page.waitForTimeout(2_000);

    await page.goto("/veiculos");
    await page.waitForTimeout(2_000);

    // O despachante é quem designa van e motorista para a rota do dia —
    // sem essa escala, a viagem não abre.
    await page.goto("/despachante");
    await page.waitForTimeout(3_000);
  });

  test("a mãe vê a filha e a viagem em andamento", async ({ page }) => {
    await entrarComo(page, "responsavel", /\/alunos/);
    await page.waitForTimeout(3_000);

    await page.goto("/notificacoes");
    await page.waitForTimeout(2_000);
  });
});
