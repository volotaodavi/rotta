import { expect, test } from "@playwright/test";

import { campo, entrarComo, placaInedita } from "./ajudantes";
import { VEICULO_SEMEADO } from "./dados-semeados";

/**
 * Cadastrar um ônibus na frota.
 *
 * ## Por que este fluxo, entre tantos CRUDs
 *
 * Porque é o primeiro trabalho real de toda transportadora que entra na
 * Rotta, e porque é o CRUD que carrega regra de verdade: a categoria é
 * sugerida pelo tipo e pela capacidade, a capacidade é validada contra
 * a faixa do tipo (VAN: de 8 a 16), e a placa é única. Um CRUD sem regra não merecia um
 * teste de interface; este tem três.
 *
 * ## Placa nova a cada execução
 *
 * O banco é semeado uma vez, e na CI um teste pode repetir. Com placa
 * fixa, a segunda tentativa falharia por placa duplicada — que é o
 * sistema funcionando, parecendo defeito.
 */

test.describe("frota", () => {
  test("a transportadora cadastra um ônibus e ele aparece na lista", async ({ page }) => {
    await entrarComo(page, "empresa", /\/empresa/);

    const placa = placaInedita();

    await page.goto("/veiculos/novo");
    await campo(page, "Placa").fill(placa);
    await campo(page, "Modelo").fill("Sprinter 415");
    await campo(page, "Marca").fill("Mercedes-Benz");
    await campo(page, "Número do ônibus").fill(`E2E-${placa.slice(-2)}`);
    await page.getByRole("combobox", { name: /^Tipo\*?$/ }).selectOption("VAN");
    await page.getByRole("spinbutton", { name: /Capacidade de passageiros/ }).fill("16");

    await page.getByRole("button", { name: "Cadastrar veículo" }).click();

    // A lista é a prova de que a escrita foi aceita E de que a leitura
    // do tenant devolve o que acabou de entrar — o caminho em que um
    // erro de RLS apareceria.
    await expect(page).toHaveURL(/\/veiculos/);
    await expect(page.getByText(placa).first()).toBeVisible({ timeout: 30_000 });
  });

  test("placa repetida é recusada, com a razão na tela", async ({ page }) => {
    // A placa do seed já está no banco. O painel precisa DIZER isso —
    // um formulário que volta ao estado inicial sem explicação faz
    // quem está cadastrando tentar de novo, igual, para sempre.
    await entrarComo(page, "empresa", /\/empresa/);

    await page.goto("/veiculos/novo");
    await campo(page, "Placa").fill(VEICULO_SEMEADO.placa);
    await campo(page, "Modelo").fill("Sprinter 415");
    await campo(page, "Marca").fill("Mercedes-Benz");
    await page.getByRole("combobox", { name: /^Tipo\*?$/ }).selectOption("VAN");
    await page.getByRole("spinbutton", { name: /Capacidade de passageiros/ }).fill("16");

    await page.getByRole("button", { name: "Cadastrar veículo" }).click();

    await expect(
      page.getByText("Já existe um veículo cadastrado com esta placa.").first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/veiculos\/novo/);
  });
});
