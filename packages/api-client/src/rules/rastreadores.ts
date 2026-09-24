import type { ItemRastreador } from "../endpoints/vehicles";

/**
 * Converte o que a pessoa colou da planilha em linhas de importação.
 *
 * O caso real é copiar duas colunas do Excel e colar — o que chega é
 * texto separado por TAB, uma linha por ônibus. Mas ninguém padroniza
 * planilha de fornecedor, então aceito também `;` e `,` como separador,
 * e ignoro linha vazia e linha de cabeçalho.
 *
 * O que NÃO faço aqui é validar IMEI ou existência do ônibus: isso é do
 * servidor, que é quem tem o banco. Esta função só separa colunas — se
 * ela começasse a julgar conteúdo, teríamos duas regras diferentes para
 * a mesma planilha, e a do navegador seria a errada.
 */
export function lerPlanilhaColada(texto: string): ItemRastreador[] {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
    .map((linha) => linha.split(/[\t;,]/).map((coluna) => coluna.trim()))
    .filter((colunas) => colunas.length >= 2 && colunas[0] && colunas[1])
    .filter((colunas) => !ehCabecalho(colunas[1]!))
    .map((colunas) => ({ identificador: colunas[0]!, imei: colunas[1]! }));
}

/**
 * Cabeçalho é reconhecido pela coluna do IMEI não ter dígito nenhum —
 * "IMEI", "Serial", "Nº de série". Testar a primeira coluna não
 * funcionaria: "412" e "Ônibus" são os dois plausíveis ali.
 */
function ehCabecalho(segundaColuna: string): boolean {
  return !/\d/.test(segundaColuna);
}
