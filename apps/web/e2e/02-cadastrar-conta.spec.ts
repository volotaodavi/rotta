import { expect, test } from "@playwright/test";

import { campo, celularInedito, cpfValidoAleatorio } from "./ajudantes";

/**
 * Criar conta de motorista autônomo, do zero até o painel.
 *
 * ## Por que o autônomo, e não a empresa LTDA
 *
 * Dois motivos, e o segundo é técnico. O primeiro: autônomo e MEI são
 * o cliente típico da Rotta — o dono que dirige. O segundo: o cadastro
 * de LTDA confirma o CNPJ na Receita Federal (BrasilAPI) e RECUSA um
 * CNPJ que não exista lá. Um CNPJ fictício, por mais válido que seja no
 * dígito verificador, reprovaria — e um teste que só passa quando a
 * BrasilAPI está fora do ar não é teste. O caminho do autônomo usa CPF
 * e não consulta ninguém.
 *
 * ## O que este fluxo protege
 *
 * Um defeito que escapou para produção por um motivo invisível em teste
 * de unidade: o plano no catálogo. Criar conta cria uma `Company`, que
 * exige `planId` — e "cadastro de empresa falha porque o plano nunca
 * foi inserido" é o tipo de coisa que só aparece atravessando o fluxo
 * inteiro contra um banco de verdade.
 *
 * ## Labels repetidos
 *
 * O formulário tem "Email", "Telefone" e "Nome" duas vezes: uma para a
 * transportadora, outra para a pessoa que vai entrar. Daí o `.nth()` —
 * a ordem no documento é a ordem visual, e trocá-las mandaria o e-mail
 * de acesso para o campo da empresa.
 */

test("um motorista autônomo cria a conta e chega ao painel", async ({ page }) => {
  const sufixo = Date.now().toString(36);
  const cpf = cpfValidoAleatorio();
  const emailDeAcesso = `autonomo-${sufixo}@rotta.test`;
  const celular = celularInedito();

  await page.goto("/criar-conta/empresa?tipo=AUTONOMO");

  // A variante do autônomo, conferida pelo que ela NÃO pede: razão
  // social virou "Nome completo", e não há contato comercial.
  await expect(page.getByText("Cadastro de motorista autônomo")).toBeVisible();

  await campo(page, "Nome completo").fill(`Motorista ${sufixo}`);
  await campo(page, "Como quer aparecer para as famílias").fill(`Van do ${sufixo}`);
  // O MESMO CPF nos dois campos, e é regra da API, não descuido do
  // teste: para autônomo, "o CPF da empresa deve ser o mesmo do
  // administrador" — a pessoa e a transportadora são a mesma coisa.
  await campo(page, "CPF/CNPJ").fill(cpf);

  await campo(page, "Email").nth(0).fill(`contato-${sufixo}@rotta.test`);
  await campo(page, "Telefone").nth(0).fill(celular);

  await campo(page, "CEP").fill("01310100");
  // O CEP preenche o endereço sozinho consultando um serviço externo.
  // Preencher à mão depois é de propósito: o teste não pode depender
  // desse serviço estar no ar, e os campos aceitam edição.
  await campo(page, "Endereço").fill("Avenida Paulista");
  await campo(page, "Número").fill("1000");
  await campo(page, "Bairro").fill("Bela Vista");
  await campo(page, "Cidade").fill("São Paulo");
  await campo(page, "Estado (UF)").fill("SP");

  await campo(page, "Nome").fill(`Motorista ${sufixo}`);
  await campo(page, "Email").nth(1).fill(emailDeAcesso);
  await campo(page, "Telefone").nth(1).fill(celular);
  await campo(page, "CPF").fill(cpf);
  await campo(page, "Senha").fill("SenhaForte@123");

  // O aceite dos termos é o que destrava o botão — e é obrigatório por
  // lei, não por estilo.
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: "Criar empresa" }).click();

  // A tela de confirmação existe por pedido explícito do produto
  // ("deverá aparecer uma tela informando que a conta foi criada...
  // um botão para 'entrar'"), e é a prova de que a API aceitou.
  await expect(page.getByText("Que bom!")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/empresa/);
});
