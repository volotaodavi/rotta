import { expect, test } from "@playwright/test";

import { celularInedito, entrarComo } from "./ajudantes";
import { EMPRESA } from "./dados-semeados";

/**
 * O caminho pelo qual uma família entra na Rotta.
 *
 * ## Por que os dois lados num arquivo só
 *
 * Porque é um fluxo, não dois: a transportadora pré-cadastra o aluno
 * com o celular da mãe, e a mãe se acha digitando o código da empresa
 * mais o mesmo celular. Separar em dois arquivos obrigaria o segundo a
 * adivinhar o celular que o primeiro inventou, ou a fixá-lo — e aí o
 * teste falharia na segunda execução por celular repetido, não por
 * defeito.
 *
 * ## O detalhe que faz o fluxo existir
 *
 * O celular é a CHAVE, e os dois lados precisam guardá-lo no mesmo
 * formato. É por isso que as duas telas usam o mesmo `PhoneInput`, e
 * está escrito no código delas: com campo livre, um lado guardaria
 * "(21) 99999-0000" e o outro "21999990000", e a busca nunca acharia
 * nada. Este teste é o que prova que continuam iguais — nenhum teste
 * de unidade compara duas telas.
 */

test("a transportadora pré-cadastra o aluno e a mãe se vincula pelo código", async ({ page }) => {
  const celular = celularInedito();
  const nomeDoAluno = `Aluno E2E ${Date.now().toString(36)}`;

  // --- Lado da transportadora ---
  await entrarComo(page, "empresa", /\/empresa/);

  await page.goto("/alunos-pre-cadastro");
  await page.getByLabel(/^Nome do aluno\*?$/).fill(nomeDoAluno);
  await page.getByLabel(/^Nome do responsável\*?$/).fill("Mãe Responsável E2E");
  await page.getByLabel(/^Celular do responsável\*?$/).fill(celular);
  await page.getByRole("button", { name: "Pré-cadastrar" }).click();

  await expect(page.getByText(nomeDoAluno).first()).toBeVisible({ timeout: 30_000 });

  // --- Lado da família ---
  // Sessão nova de propósito: a mãe não compartilha navegador com a
  // transportadora, e reaproveitar o estado esconderia um defeito de
  // autenticação entre perfis.
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* Navegador sem armazenamento: nada a limpar. */
    }
  });

  await entrarComo(page, "responsavel", /\/alunos/);

  await page.goto("/vincular-transporte");
  await page.getByLabel(/^Código da transportadora\*?$/).fill(EMPRESA.codigoInterno);
  await page.getByLabel(/^Seu celular\*?$/).fill(celular);
  await page.getByRole("button", { name: "Buscar" }).click();

  // Achou: o nome do aluno que a transportadora digitou aparece na tela
  // da mãe. É a prova de que o código e o celular casaram — as duas
  // metades do fluxo se encontrando.
  await expect(page.getByText("Encontramos um cadastro!")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(nomeDoAluno)).toBeVisible();
  await expect(page.getByText(EMPRESA.nomeFantasia)).toBeVisible();

  await page.getByRole("button", { name: "Continuar" }).click();

  // O destino é o cadastro do aluno, já com o nome preenchido: é o que
  // o produto pediu ("já aparece com o nome do aluno preenchido").
  await expect(page).toHaveURL(/\/alunos/, { timeout: 30_000 });
});

test("código certo e celular errado não vinculam ninguém", async ({ page }) => {
  // O caminho infeliz é o que protege a criança: vincular o aluno de
  // outra família por um celular que não casa seria dar a estranho o
  // acompanhamento de uma criança. A tela precisa dizer que não achou,
  // e oferecer o cadastro do zero.
  await entrarComo(page, "responsavel", /\/alunos/);

  await page.goto("/vincular-transporte");
  await page.getByLabel(/^Código da transportadora\*?$/).fill(EMPRESA.codigoInterno);
  await page.getByLabel(/^Seu celular\*?$/).fill("21988887777");
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(page.getByText(/não encontramos nenhum pré-cadastro/i)).toBeVisible({
    timeout: 30_000,
  });
});
