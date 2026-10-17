import { z } from "zod";

/**
 * Deixa o telefone só com os dígitos que importam: DDD + número.
 *
 * Tira o código do país (+55), muito comum quando o número é copiado
 * do WhatsApp ou da agenda, e o prefixo de tronco "0" do formato
 * antigo de discagem, que muita gente ainda digita por hábito.
 *
 * ## Por que normalizar virou obrigatório em 17/10/2026
 *
 * Porque o telefone é LOGIN na Rotta, e até aqui ele era gravado
 * exatamente como a pessoa digitou. Quem cadastrava um responsável
 * escrevendo "(21) 99709-9557" gravava a máscara junto; na hora de
 * entrar, o login reduz o que foi digitado a dígitos e procura
 * "21997099557", que não é a mesma string. A conta existia e não
 * abria, para sempre, sem nenhuma mensagem que explicasse.
 *
 * Pelo mesmo motivo, a checagem de duplicidade também escapava: o
 * mesmo número com e sem máscara são dois valores diferentes para o
 * banco, e o índice único não impedia as duas contas.
 */
export function normalizarTelefone(value: string): string {
  let digits = value.replace(/\D/g, "");

  /* Código do país (+55). Sem ambiguidade com o DDD 55 (Rio Grande do
     Sul): um número de 11 dígitos começando em "55" já é válido por
     tamanho, e esta remoção só entra em 12 ou 13 dígitos, tamanho que
     nunca é válido sem o código do país na frente. */
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  /* Prefixo de tronco "0" antes do DDD ("011 99999-9999"). Nenhum DDD
     real começa em zero, então não há ambiguidade. */
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Telefone brasileiro, fixo ou celular, com DDD — Dossiê 15 `AUTH-01`.
 *
 * ACHADO REAL (pedido explícito do usuário, bloqueado tentando criar
 * conta com um número real: "Quem é você para validar um telefone
 * celular?... libere a criação de conta, depois eu verifico se é
 * verdadeiro ou não"): a versão anterior exigia, além da contagem de
 * dígitos, um padrão rígido por tipo. Isso rejeitava números reais que
 * só não batiam essas suposições.
 *
 * Esta função continua frouxa de propósito, e agora tem um lugar certo
 * de uso: telefone de ESCOLA e de EMPRESA, que pode ser fixo e não
 * serve para entrar no sistema. Para o número de uma PESSOA, que é
 * login e é por onde ela recebe aviso de viagem, use
 * `isValidBrazilianMobile`.
 */
export function isValidBrazilianPhone(value: string): boolean {
  const digits = normalizarTelefone(value);
  return digits.length === 11 || digits.length === 10;
}

/**
 * Celular brasileiro: o número que serve de login e de contato.
 *
 * ## Por que aqui a regra é apertada, e no fixo não
 *
 * Porque o estrago é de natureza diferente. Um telefone de escola
 * digitado errado é um telefone errado na ficha da escola. Um celular
 * de responsável digitado errado é uma pessoa que **nunca mais entra
 * na conta dela**: é por ele que ela faz login, e quem cadastrou (a
 * transportadora) costuma não ser ela, então ninguém confere o dígito
 * na hora.
 *
 * As três regras abaixo são as que a numeração brasileira garante
 * desde 2016, e nenhuma delas é suposição de formato:
 *
 * - **11 dígitos.** Celular no Brasil tem DDD + 9 dígitos. Dez dígitos
 *   é fixo, e fixo não recebe mensagem.
 * - **DDD entre 11 e 99.** Não existe DDD começando em zero, nem DDD
 *   de um dígito.
 * - **Começa em 9** depois do DDD. É o nono dígito, obrigatório em
 *   todo o país desde 2016 para celular.
 *
 * Isso pega exatamente o erro que acontece de verdade: dígito a menos,
 * dígito a mais, DDD esquecido, e número fixo no lugar do celular.
 */
export function isValidBrazilianMobile(value: string): boolean {
  const digits = normalizarTelefone(value);
  if (digits.length !== 11) return false;

  const ddd = Number(digits.slice(0, 2));
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) return false;

  return digits[2] === "9";
}

/** Telefone fixo ou celular, já normalizado para dígitos. */
export const phoneSchema = z
  .string()
  .transform(normalizarTelefone)
  .refine(isValidBrazilianPhone, { message: "Telefone inválido" });

/** Celular (login/contato de uma pessoa), já normalizado para dígitos. */
export const mobileSchema = z
  .string()
  .transform(normalizarTelefone)
  .refine(isValidBrazilianMobile, {
    message: "Informe um celular com DDD, no formato (11) 91234-5678",
  });
