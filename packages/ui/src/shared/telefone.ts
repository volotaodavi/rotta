/**
 * Máscara de telefone brasileiro, compartilhada entre as duas
 * plataformas de `@rotta/ui`.
 *
 * Mora aqui, fora de `web/` e de `native/`, porque o campo de telefone
 * da web e o do aplicativo precisam formatar exatamente igual: o
 * número é LOGIN na Rotta, e dois formatos diferentes do mesmo número
 * são duas contas diferentes para o banco. Enquanto cada plataforma
 * tinha a sua cópia, era só questão de tempo até uma divergir.
 *
 * A validação continua em `@rotta/validators` (`normalizarTelefone`,
 * `isValidBrazilianMobile`) — isto aqui é só apresentação, e é por isso
 * que não está lá.
 */

/** Máximo de dígitos aceitos num campo: DDD (2) + celular com o nono dígito (9). Nunca código do país, nunca prefixo de tronco. */
export const MAX_DIGITOS_TELEFONE = 11;

/** Deixa só os dígitos e para no limite — o formato que a API espera. */
export function somenteDigitosDeTelefone(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, MAX_DIGITOS_TELEFONE);
}

/**
 * Dígitos puros → o que a pessoa lê enquanto digita.
 *
 * `"11987654321"` → `"(11) 98765-4321"`; `"1123456789"` (fixo) →
 * `"(11) 2345-6789"`.
 *
 * O corte do hífen depende do TOTAL de dígitos, e não de uma posição
 * fixa: celular é 5+4 e fixo é 4+4. A versão anterior cortava sempre
 * no quinto, então todo telefone fixo aparecia como `(11) 23456-789`,
 * um número que não existe — e a Rotta tem campo de telefone de escola
 * e de empresa, onde fixo é a regra, não a exceção. Enquanto a pessoa
 * digita, o grupo se reparte ao chegar no décimo primeiro dígito,
 * igual a qualquer máscara de telefone brasileiro.
 */
export function formatarTelefone(digitos: string): string {
  const ddd = digitos.slice(0, 2);
  const local = digitos.slice(2);
  if (!ddd) return "";
  if (digitos.length <= 2) return `(${ddd}`;

  const naParte = digitos.length === 10 ? 4 : 5;
  if (local.length <= naParte) return `(${ddd}) ${local}`;
  return `(${ddd}) ${local.slice(0, naParte)}-${local.slice(naParte)}`;
}
