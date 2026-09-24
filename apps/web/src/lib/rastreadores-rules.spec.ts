import { lerPlanilhaColada } from "@rotta/api-client";
import { describe, expect, it } from "vitest";

/**
 * Importação de lote de rastreadores (24/09/2026).
 *
 * Mora aqui, e não no app Admin, pela mesma razão de
 * `paradas-rules.spec.ts`: a regra é compartilhada (`@rotta/api-client`)
 * e `apps/web` é o app que tem runner de teste configurado.
 *
 * Os casos são o que chega de uma planilha REAL de fornecedor: colada
 * do Excel, com cabeçalho, com linha em branco no fim, às vezes com `;`
 * em vez de TAB. Se esta função errar, o Admin acha que credenciou 40
 * ônibus e credenciou 38.
 */
describe("lerPlanilhaColada", () => {
  it("lê o caso normal — duas colunas coladas do Excel (TAB)", () => {
    expect(lerPlanilhaColada("412\t863719060123456\n118\t863719060999888")).toEqual([
      { identificador: "412", imei: "863719060123456" },
      { identificador: "118", imei: "863719060999888" },
    ]);
  });

  it("descarta o cabeçalho da planilha", () => {
    // Cabeçalho é detectado pela coluna do IMEI não ter dígito nenhum —
    // testar a primeira coluna não serviria, porque "412" e "Ônibus"
    // são os dois plausíveis ali.
    expect(lerPlanilhaColada("Onibus\tIMEI\n412\t863719060123456")).toEqual([
      { identificador: "412", imei: "863719060123456" },
    ]);
  });

  it("aceita ponto e vírgula e vírgula — fornecedor nenhum padroniza planilha", () => {
    expect(lerPlanilhaColada("412;863719060123456")).toEqual([
      { identificador: "412", imei: "863719060123456" },
    ]);
    expect(lerPlanilhaColada("412,863719060123456")).toEqual([
      { identificador: "412", imei: "863719060123456" },
    ]);
  });

  it("ignora linha em branco no meio e no fim", () => {
    expect(lerPlanilhaColada("412\t863719060123456\n\n118\t863719060999888\n\n")).toHaveLength(2);
  });

  it("aceita placa no lugar do número — frota privada não tem numeração", () => {
    expect(lerPlanilhaColada("ABC1D23\t863719060123456")).toEqual([
      { identificador: "ABC1D23", imei: "863719060123456" },
    ]);
  });

  it("descarta linha com uma coluna só, em vez de inventar um IMEI vazio", () => {
    expect(lerPlanilhaColada("412\n118\t863719060999888")).toEqual([
      { identificador: "118", imei: "863719060999888" },
    ]);
  });

  it("NÃO julga se o IMEI é válido — isso é do servidor, que tem o banco", () => {
    // Duas regras diferentes para a mesma planilha seria pior que uma
    // só, e a do navegador seria a errada.
    expect(lerPlanilhaColada("412\t123")).toEqual([{ identificador: "412", imei: "123" }]);
  });
});
