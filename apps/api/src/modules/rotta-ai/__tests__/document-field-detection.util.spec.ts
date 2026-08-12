import {
  detectDriverDocumentFields,
  detectVehicleDocumentFields,
} from "../document-field-detection.util";

describe("detectVehicleDocumentFields", () => {
  it("CRLV: encontra RENAVAM mesmo com pontuação/separadores dentro do número", () => {
    const encontrados = detectVehicleDocumentFields("RENAVAM: 123.456.789-01", "CRLV");
    expect(encontrados).toContain("RENAVAM (11 dígitos)");
  });

  it("CRLV: encontra placa Mercosul válida em meio a outro texto", () => {
    const encontrados = detectVehicleDocumentFields("VEICULO PLACA ABC1D23 COR PRATA", "CRLV");
    expect(encontrados).toContain("Placa em formato válido");
  });

  it("CRLV: não confunde uma sequência de 7 caracteres qualquer com placa", () => {
    const encontrados = detectVehicleDocumentFields("CODIGO XPTO999", "CRLV");
    expect(encontrados).not.toContain("Placa em formato válido");
  });

  it("SEGURO: encontra apólice/seguradora/vigência", () => {
    const encontrados = detectVehicleDocumentFields(
      "Apólice nº 12345 - Seguradora Alfa - Vigência 12 meses",
      "SEGURO",
    );
    expect(encontrados).toEqual(
      expect.arrayContaining(['Palavra "apólice"', 'Palavra "seguradora"', 'Palavra "vigência"']),
    );
  });

  it("VISTORIA: encontra vistoria/laudo/resultado", () => {
    const encontrados = detectVehicleDocumentFields("Laudo de Vistoria - Aprovado", "VISTORIA");
    expect(encontrados).toEqual(
      expect.arrayContaining([
        'Palavra "vistoria"',
        'Palavra "laudo"',
        "Resultado (aprovado/reprovado)",
      ]),
    );
  });

  it("tipo desconhecido: nunca lança, só devolve lista vazia", () => {
    expect(detectVehicleDocumentFields("qualquer texto", "FOTO")).toEqual([]);
  });

  it("texto vazio: nunca lança, devolve lista vazia", () => {
    expect(detectVehicleDocumentFields("", "CRLV")).toEqual([]);
  });
});

describe("detectDriverDocumentFields", () => {
  it("EAR: encontra a sigla e as expressões esperadas", () => {
    const encontrados = detectDriverDocumentFields(
      "Autorização Especializada EAR para Transporte Escolar",
      "EAR",
    );
    expect(encontrados).toEqual(
      expect.arrayContaining([
        'Sigla "EAR"',
        'Palavra "especializado"',
        'Expressão "transporte escolar"',
      ]),
    );
  });

  it("CURSO: encontra curso/conclusão/carga horária", () => {
    const encontrados = detectDriverDocumentFields(
      "Certificado de Conclusão de Curso - Carga Horária 40h",
      "CURSO",
    );
    expect(encontrados).toEqual(
      expect.arrayContaining([
        'Palavra "curso"',
        'Palavra "conclusão"/"certificado"',
        'Expressão "carga horária"',
      ]),
    );
  });

  it("nada encontrado: devolve lista vazia sem lançar", () => {
    expect(detectDriverDocumentFields("texto qualquer sem nada relevante", "EAR")).toEqual([]);
  });
});
