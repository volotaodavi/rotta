import { computeEscolarVerificado } from "../escolar-verification.util";

import type { DriverDocument, DriverDocumentType, Vehicle } from "@prisma/client";

function buildDocument(overrides: Partial<DriverDocument> = {}): DriverDocument {
  return {
    id: "document-1",
    userId: "driver-1",
    companyId: "company-1",
    tipo: "CNH",
    numero: null,
    categoria: "D",
    nomeOriginal: "cnh.jpg",
    mimeType: "image/jpeg",
    fileUrl: "https://storage.test/cnh.jpg",
    filePath: null,
    vencimentoEm: null,
    rottaAiStatus: "APROVADO",
    rottaAiQualidadeOk: null,
    rottaAiLegivel: null,
    rottaAiSuspeitaAdulteracao: null,
    rottaAiObservacoes: null,
    rottaAiAnalisadoEm: null,
    uploadedByUserId: "driver-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

/** CNH D + EAR + curso + antecedentes, todos aprovados — motorista `ELIGIBLE` de verdade. */
function buildDocumentosCompletos(): DriverDocument[] {
  return [
    buildDocument({ id: "cnh-1", tipo: "CNH" }),
    buildDocument({ id: "ear-1", tipo: "EAR" as DriverDocumentType, categoria: null }),
    buildDocument({
      id: "curso-1",
      tipo: "CURSO_TRANSPORTE_ESCOLAR" as DriverDocumentType,
      categoria: null,
    }),
    buildDocument({
      id: "antecedentes-1",
      tipo: "ANTECEDENTES_CRIMINAIS" as DriverDocumentType,
      categoria: null,
    }),
  ];
}

function buildVehicle(
  overrides: Partial<Vehicle> & {
    ultimoMotorista?: { documentosMotorista: DriverDocument[] } | null;
  } = {},
): Vehicle & { ultimoMotorista: { documentosMotorista: DriverDocument[] } | null } {
  return {
    id: "vehicle-1",
    companyId: "company-1",
    placa: "ABC1D23",
    modelo: "Sprinter",
    marca: "Mercedes",
    ano: 2020,
    cor: "Branco",
    renavam: null,
    chassi: null,
    capacidadePassageiros: 20,
    tipo: "VAN",
    categoria: "ESCOLAR",
    observacoes: null,
    fotoUrl: null,
    status: "DISPONIVEL",
    quilometragemAtual: 1000,
    ultimaLatitude: null,
    ultimaLongitude: null,
    ultimaPosicaoEm: null,
    viagemAtualId: null,
    ultimoMotoristaId: "driver-1",
    ultimoMonitorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ultimoMotorista: { documentosMotorista: buildDocumentosCompletos() },
    ...overrides,
  };
}

describe("computeEscolarVerificado (Dossiê 45 — achado C1 da auditoria Legal↔Produto)", () => {
  it("retorna true quando há veículo ESCOLAR com motorista ELIGIBLE de verdade", () => {
    expect(computeEscolarVerificado([buildVehicle()])).toBe(true);
  });

  it("retorna false quando a frota não tem nenhum veículo ESCOLAR (só declarado, não é o caso)", () => {
    expect(computeEscolarVerificado([buildVehicle({ categoria: "PARTICULAR" })])).toBe(false);
  });

  it("retorna false quando o veículo é ESCOLAR mas não tem motorista vinculado (`ultimoMotoristaId` null)", () => {
    expect(
      computeEscolarVerificado([buildVehicle({ ultimoMotoristaId: null, ultimoMotorista: null })]),
    ).toBe(false);
  });

  it("retorna false quando o veículo é ESCOLAR mas o motorista não tem os documentos completos (ex. sem EAR)", () => {
    const semEar = buildVehicle({
      ultimoMotorista: {
        documentosMotorista: buildDocumentosCompletos().filter((d) => d.tipo !== "EAR"),
      },
    });
    expect(computeEscolarVerificado([semEar])).toBe(false);
  });

  it("retorna false quando o veículo é ESCOLAR mas o motorista só tem CNH categoria B (achado C1 — nunca inferir elegibilidade só da categoria do veículo)", () => {
    const cnhB = buildVehicle({
      ultimoMotorista: {
        documentosMotorista: [buildDocument({ id: "cnh-1", tipo: "CNH", categoria: "B" })],
      },
    });
    expect(computeEscolarVerificado([cnhB])).toBe(false);
  });

  it("retorna true quando pelo menos UM dos vários veículos ESCOLAR tem motorista elegível, mesmo que outros não tenham", () => {
    const semMotorista = buildVehicle({
      id: "vehicle-2",
      ultimoMotoristaId: null,
      ultimoMotorista: null,
    });
    const comMotoristaElegivel = buildVehicle({ id: "vehicle-3" });
    expect(computeEscolarVerificado([semMotorista, comMotoristaElegivel])).toBe(true);
  });

  it("retorna false para frota vazia", () => {
    expect(computeEscolarVerificado([])).toBe(false);
  });
});
