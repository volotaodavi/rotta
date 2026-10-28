import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * Credenciar rastreador: individual e em lote.
 *
 * ## Por que este fluxo tem teste de interface, sendo feito uma vez por
 * aparelho
 *
 * Porque o erro aqui é silencioso e grave. Credenciar amarra um IMEI a
 * um ônibus, e daí em diante toda posição que chegar com aquele IMEI
 * aparece como sendo daquele carro — inclusive no app dos responsáveis.
 * IMEI trocado é a família de uma criança acompanhando o ônibus de
 * outra, e nada na tela indica o erro: o mapa funciona, só mostra o
 * carro errado.
 *
 * ## O lote é o caminho real
 *
 * O pedido que originou a tela foi explícito: "comprei um lote de
 * rastreador... como irei cadastrar". Ninguém credencia setenta
 * aparelhos um por um, e é por isso que o lote cola a planilha do
 * instalador, com tabulação, direto do Excel. Este teste cola exatamente
 * isso.
 */

const CREDENCIAIS = {
  email: "admin.e2e@rotta.test",
  senha: "SenhaForte@123",
} as const;

/** A placa que o seed criou (`apps/api/prisma/seed-e2e.ts`). */
const VEICULO_SEMEADO = { placa: "RTA1E23", numeroFrota: "E2E-01" } as const;

/**
 * Um IMEI novo a cada execução.
 *
 * É único GLOBAL — o mesmo aparelho não pode estar em dois ônibus, nem
 * de empresas diferentes —, então um IMEI fixo falharia na segunda
 * execução por conflito, que é o sistema funcionando.
 */
function imeiInedito(): string {
  const sufixo = String(Date.now()).slice(-9);
  return `8637190${sufixo}`.slice(0, 15).padEnd(15, "0");
}

async function entrar(page: Page): Promise<void> {
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: /^Email, telefone ou CPF\*?$/ }).fill(CREDENCIAIS.email);
  await page.getByRole("textbox", { name: /^Senha\*?$/ }).fill(CREDENCIAIS.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  // A home do Admin é `/`; o login redireciona para lá.
  await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 30_000 });
}

test.describe("painel administrativo", () => {
  test("a equipe Rotta entra no painel", async ({ page }) => {
    // Só a senha, de propósito: o segundo fator foi desligado para
    // admin a pedido do sócio ("deixe o login livre, apenas com a
    // senha"). Se alguém reativar o TOTP sem querer, este teste cai.
    await entrar(page);

    await expect(page.getByText(/rotta/i).first()).toBeVisible();
  });

  test("credencia um IMEI no ônibus, pela página dele", async ({ page }) => {
    await entrar(page);

    const imei = imeiInedito();

    await page.goto("/veiculos");
    await expect(page.getByText(VEICULO_SEMEADO.placa).first()).toBeVisible({ timeout: 30_000 });
    await page.getByText(VEICULO_SEMEADO.placa).first().click();

    // O campo do IMEI é a prova de que a página do ônibus abriu — e é
    // mais específico que o título "Rastreador", que aparece também no
    // texto de ajuda e no aviso de "sem rastreador credenciado".
    const campoDoImei = page.getByRole("textbox", { name: /IMEI do rastreador/ });
    await expect(campoDoImei).toBeVisible({ timeout: 30_000 });
    await campoDoImei.fill(imei);
    await page.getByRole("button", { name: "Credenciar" }).click();

    // A data de credenciamento no texto de ajuda é a prova de que a
    // API gravou: ela só existe depois de `rastreadorVinculadoEm`.
    await expect(page.getByText(/Credenciado em/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Desvincular" })).toBeVisible();
  });

  test("credencia um lote colado da planilha do instalador", async ({ page }) => {
    await entrar(page);

    const imei = imeiInedito();

    await page.goto("/veiculos/rastreadores");
    await page.getByRole("combobox", { name: /Transportadora/ }).selectOption({ index: 1 });

    // Tabulação entre as colunas: é o que o Excel coloca ao copiar, e o
    // que `lerPlanilhaColada` espera. Cabeçalho e linha em branco são
    // ignorados de propósito — a planilha do instalador tem os dois.
    await page
      .getByRole("textbox", { name: /Planilha/ })
      .fill(`ônibus\timei\n${VEICULO_SEMEADO.numeroFrota}\t${imei}\n\n`);

    // O contador antes do envio é o que impede o erro mais caro desta
    // tela: colar a coluna errada e só descobrir depois de gravar.
    await expect(page.getByText(/1 ônibus reconhecido/)).toBeVisible();

    await page.getByRole("button", { name: "Credenciar lote" }).click();

    await expect(page.getByText(/credenciad/i).first()).toBeVisible({ timeout: 30_000 });
  });
});
