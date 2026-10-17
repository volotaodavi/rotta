/** Devolvido quando o texto não é um valor em reais que dê para cobrar. */
export const VALOR_INVALIDO = null;

/**
 * `"1.234,56"` digitado → `123456` centavos.
 *
 * ## Por que isto não é `Number(valor.replace(",", "."))`
 *
 * Porque era, em cinco telas de dinheiro, e `replace` com string troca
 * só a PRIMEIRA ocorrência. Em notação brasileira o ponto é separador
 * de milhar, e o resultado era um de dois erros, ambos silenciosos:
 *
 * - `"1.234,56"` virava `"1.234.56"`, que é `NaN`. O formulário
 *   recusava um valor perfeitamente válido, ou mandava `NaN` adiante.
 * - `"1.234"` virava `1.234` **reais** e depois `123` centavos. Quem
 *   digitava mil duzentos e trinta e quatro reais pedia uma
 *   transferência de um real e vinte e três centavos.
 *
 * As telas onde isso vivia são as piores possíveis para um erro de
 * valor: saque do motorista, transferência do Admin, cobrança Pix
 * avulsa e mensalidade do contrato.
 *
 * ## Como o texto é lido
 *
 * A última vírgula ou ponto, quando seguida de 1 ou 2 dígitos até o
 * fim, é o separador decimal. Qualquer outra vírgula ou ponto é
 * separador de milhar e é descartada. Isso lê certo as três grafias
 * que aparecem de verdade: `1.234,56`, `1234,56` e `1234.56`.
 *
 * `"1.234"` é mil duzentos e trinta e quatro reais, e não um real e
 * vinte e três, porque três dígitos depois do separador não são
 * centavos em nenhuma leitura razoável de um campo em reais.
 *
 * Devolve `null` (e não `NaN`, e nunca `0`) quando não dá para ler: um
 * zero fingido num campo de dinheiro é como um erro de valor começa.
 */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.trim().replace(/\s|R\$/g, "");
  if (!limpo) return VALOR_INVALIDO;

  /* Aceita só dígito, vírgula e ponto: qualquer outra coisa é entrada
     que não sabemos ler, e adivinhar o valor é pior que recusar. */
  if (!/^[\d.,]+$/.test(limpo)) return VALOR_INVALIDO;

  const decimal = /[.,](\d{1,2})$/.exec(limpo);
  const centavosTexto = decimal ? decimal[1]!.padEnd(2, "0") : "00";
  const parteInteira = decimal ? limpo.slice(0, decimal.index) : limpo;

  if (parteInteira === "" && !decimal) return VALOR_INVALIDO;

  /* Separador na parte inteira só vale como milhar, e milhar vem em
     grupos de três. Sem esta checagem, `"12,34,56"` seria lido como
     `1234,56`: a entrada é malformada e o valor sairia errado em
     silêncio, que é exatamente o que não pode acontecer aqui. */
  const soDigitos = /^\d*$/.test(parteInteira);
  const milharValido = /^\d{1,3}([.,]\d{3})+$/.test(parteInteira);
  if (!soDigitos && !milharValido) return VALOR_INVALIDO;

  const inteiroTexto = parteInteira.replace(/[.,]/g, "");
  const centavos = Number(inteiroTexto || "0") * 100 + Number(centavosTexto);
  return Number.isSafeInteger(centavos) ? centavos : VALOR_INVALIDO;
}

/** `123456` centavos → `"R$ 1.234,56"`, do jeito que a pessoa lê. */
export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
