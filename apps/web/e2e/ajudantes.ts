import { expect } from "@playwright/test";

import { CONTAS } from "./dados-semeados";

import type { Locator, Page } from "@playwright/test";

/**
 * Entrar, para os testes que não são SOBRE entrar.
 *
 * Deliberadamente pela interface, e não injetando token no
 * `localStorage`: o atalho pareceria mais rápido e esconderia a classe
 * de defeito mais comum aqui — a sessão que a API devolve e o painel
 * não consegue usar. Além disso, o atalho obrigaria este arquivo a
 * saber onde o token é guardado, e aí um teste de fluxo passaria a
 * depender de um detalhe do `@rotta/auth`.
 */
export async function entrarComo(
  page: Page,
  quem: keyof typeof CONTAS,
  destino: RegExp,
): Promise<void> {
  const conta = CONTAS[quem];

  await page.goto("/entrar");
  await page.getByLabel("Email, telefone ou CPF").fill(conta.email);
  await page.getByLabel(/^Senha\*?$/).fill(conta.senha);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(destino, { timeout: 30_000 });
}

/**
 * Uma placa que ainda não existe no banco.
 *
 * O cadastro de veículo recusa placa repetida — e deve. Como o banco é
 * semeado uma vez e os testes podem repetir (há uma repetição na CI),
 * uma placa fixa falharia na segunda tentativa por um motivo que não é
 * o defeito que o teste procura.
 *
 * Formato Mercosul (`AAA1A23`), que é o que o validador exige.
 */
export function placaInedita(): string {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letra = (): string => letras[Math.floor(Math.random() * letras.length)]!;
  const digito = (): string => String(Math.floor(Math.random() * 10));
  return `${letra()}${letra()}${letra()}${digito()}${letra()}${digito()}${digito()}`;
}

/** Um celular brasileiro válido e improvável, para o pré-cadastro. */
export function celularInedito(): string {
  const sufixo = String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
  return `2199${sufixo}${String(Math.floor(Math.random() * 10))}00`.slice(0, 11);
}

/**
 * Um CPF válido no dígito verificador e fictício.
 *
 * Aleatório por execução porque o cadastro recusa CPF repetido — e
 * deve: duas contas com o mesmo CPF seriam a mesma pessoa duas vezes.
 */
export function cpfValidoAleatorio(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

  const digito = (digitos: number[]): number => {
    const peso = digitos.length + 1;
    const soma = digitos.reduce((total, numero, indice) => total + numero * (peso - indice), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiro = digito(base);
  const segundo = digito([...base, primeiro]);
  return [...base, primeiro, segundo].join("");
}

/**
 * Um campo de texto pelo rótulo visível.
 *
 * ## Por que não `getByLabel`
 *
 * Duas razões, as duas descobertas rodando. A primeira: campo
 * obrigatório desenha um asterisco DENTRO do rótulo, então o nome
 * acessível é "Cidade*", e `getByLabel("Cidade")` casa por substring —
 * o que parece conveniente até casar com outra coisa. A segunda: foi
 * exatamente o que aconteceu. `getByLabel("Cidade")` casou também com
 * a caixa de aceite dos termos, que não é campo de texto nenhum, e o
 * teste morreu com "strict mode violation" num lugar que não tem nada
 * a ver com cidade.
 *
 * Pedir o PAPEL (`textbox`) junto com o nome ancorado nas pontas
 * resolve as duas: caixa de seleção não é `textbox`, e o `$` depois do
 * asterisco opcional impede "Nome" de casar com "Nome do aluno".
 */
export function campo(page: Page, rotulo: string): Locator {
  const escapado = rotulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page.getByRole("textbox", { name: new RegExp(`^${escapado}\\*?$`) });
}
