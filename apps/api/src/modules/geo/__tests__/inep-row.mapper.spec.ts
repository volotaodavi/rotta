import { INEP_COLUMNS, mapInepRowToSchoolData } from "../inep/inep-row.mapper";

function buildRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    [INEP_COLUMNS.codigoInep]: "35000123",
    [INEP_COLUMNS.nomeOficial]: "EMEF Professora Ana Souza",
    [INEP_COLUMNS.situacaoFuncionamento]: "1",
    [INEP_COLUMNS.dependenciaAdministrativa]: "3",
    [INEP_COLUMNS.categoriaEscolaPrivada]: "",
    [INEP_COLUMNS.cep]: "01310100",
    [INEP_COLUMNS.logradouro]: "Avenida Paulista",
    [INEP_COLUMNS.numero]: "1000",
    [INEP_COLUMNS.complemento]: "",
    [INEP_COLUMNS.bairro]: "Bela Vista",
    [INEP_COLUMNS.cidade]: "São Paulo",
    [INEP_COLUMNS.estado]: "SP",
    [INEP_COLUMNS.ddd]: "11",
    [INEP_COLUMNS.telefone]: "32570000",
    ...overrides,
  };
}

describe("mapInepRowToSchoolData", () => {
  it("mapeia uma linha válida do Censo Escolar (dependência municipal) para CreateSchoolData", () => {
    const resultado = mapInepRowToSchoolData(buildRow());

    expect(resultado.error).toBeUndefined();
    expect(resultado.ignorada).toBeUndefined();
    expect(resultado.mapped).toEqual({
      codigoInep: "35000123",
      data: {
        codigoInep: "35000123",
        nomeOficial: "EMEF Professora Ana Souza",
        dependenciaAdministrativa: "MUNICIPAL",
        cep: "01310-100",
        logradouro: "Avenida Paulista",
        numero: "1000",
        complemento: undefined,
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        telefone: "(11) 32570000",
      },
    });
  });

  it("ignora (não é erro) uma escola fora de atividade", () => {
    const resultado = mapInepRowToSchoolData(
      buildRow({ [INEP_COLUMNS.situacaoFuncionamento]: "2" }),
    );

    expect(resultado.error).toBeUndefined();
    expect(resultado.mapped).toBeUndefined();
    expect(resultado.ignorada).toContain("35000123");
  });

  it("rejeita quando CO_ENTIDADE está ausente", () => {
    const resultado = mapInepRowToSchoolData(buildRow({ [INEP_COLUMNS.codigoInep]: "" }));

    expect(resultado.mapped).toBeUndefined();
    expect(resultado.error).toContain(INEP_COLUMNS.codigoInep);
  });

  it("rejeita quando o endereço vem incompleto", () => {
    const resultado = mapInepRowToSchoolData(buildRow({ [INEP_COLUMNS.logradouro]: "" }));

    expect(resultado.error).toContain("endereço incompleto");
  });

  it("refina TP_DEPENDENCIA=4 (privada) para FILANTROPICA via TP_CATEGORIA_ESCOLA_PRIVADA=4", () => {
    const resultado = mapInepRowToSchoolData(
      buildRow({
        [INEP_COLUMNS.dependenciaAdministrativa]: "4",
        [INEP_COLUMNS.categoriaEscolaPrivada]: "4",
      }),
    );

    expect(resultado.mapped?.data.dependenciaAdministrativa).toBe("FILANTROPICA");
  });

  it("usa PRIVADA como default quando TP_DEPENDENCIA=4 sem categoria reconhecida", () => {
    const resultado = mapInepRowToSchoolData(
      buildRow({
        [INEP_COLUMNS.dependenciaAdministrativa]: "4",
        [INEP_COLUMNS.categoriaEscolaPrivada]: "",
      }),
    );

    expect(resultado.mapped?.data.dependenciaAdministrativa).toBe("PRIVADA");
  });

  it("rejeita um TP_DEPENDENCIA não reconhecido", () => {
    const resultado = mapInepRowToSchoolData(
      buildRow({ [INEP_COLUMNS.dependenciaAdministrativa]: "9" }),
    );

    expect(resultado.error).toContain("TP_DEPENDENCIA");
  });
});
