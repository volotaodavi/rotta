import { expect, test } from "@playwright/test";

import { CONTAS, EMPRESA } from "./dados-semeados";

/**
 * Entrar no painel.
 *
 * ## Por que este é o primeiro
 *
 * Porque sem ele nada mais existe. É também o fluxo com o histórico
 * mais acidentado do produto: a API dorme no plano gratuito do Render,
 * e o login já chegou a esperar noventa segundos — o que gerou um teto
 * de espera no aplicativo, que por sua vez abriu um furo de segurança
 * (identidade não verificada passando), consertado em 16/10/2026. Um
 * teste que atravessa o login de ponta a ponta é o que pega esse tipo
 * de interação, que nenhum teste de unidade vê.
 */

test.describe("entrar no painel", () => {
  test("a dona da transportadora entra e chega ao painel dela", async ({ page }) => {
    await page.goto("/entrar");

    await page.getByLabel("Email, telefone ou CPF").fill(CONTAS.empresa.email);
    await page.getByLabel(/^Senha\*?$/).fill(CONTAS.empresa.senha);
    await page.getByRole("button", { name: "Entrar" }).click();

    // O nome da empresa no painel é a prova de que o token foi aceito,
    // o tenant foi resolvido e a primeira consulta autenticada voltou.
    await expect(page.getByText(EMPRESA.nomeFantasia).first()).toBeVisible();
    await expect(page).toHaveURL(/\/empresa/);
  });

  test("senha errada não entra, e o painel diz por quê", async ({ page }) => {
    // O caminho infeliz importa tanto quanto o feliz: uma mensagem que
    // não aparece é indistinguível de um formulário que travou, e quem
    // está digitando conclui que o sistema está fora do ar.
    await page.goto("/entrar");

    await page.getByLabel("Email, telefone ou CPF").fill(CONTAS.empresa.email);
    await page.getByLabel(/^Senha\*?$/).fill("SenhaErrada@999");
    await page.getByRole("button", { name: "Entrar" }).click();

    // O texto é deliberadamente vago ("verifique os dados"), e isso é
    // segurança, não desleixo: dizer "senha errada" confirmaria a quem
    // está tentando que aquele e-mail EXISTE. O teste afirma o que
    // importa — que a recusa aparece —, não a redação.
    await expect(page.getByText(/não foi possível entrar/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("a mãe entra e cai na área dela, não no painel da transportadora", async ({ page }) => {
    // Mesma tela de login, dois mundos. Se a identidade de Responsável
    // caísse no painel profissional, uma mãe veria a frota e a equipe
    // de uma empresa — o pior defeito possível num produto
    // multiempresa.
    await page.goto("/entrar");

    await page.getByLabel("Email, telefone ou CPF").fill(CONTAS.responsavel.email);
    await page.getByLabel(/^Senha\*?$/).fill(CONTAS.responsavel.senha);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/alunos/);
    await expect(page.getByText(EMPRESA.nomeFantasia)).toHaveCount(0);
  });
});
