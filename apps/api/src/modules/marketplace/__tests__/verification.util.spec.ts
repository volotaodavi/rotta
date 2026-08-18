import { computeVerified } from "../verification.util";

import type { Vehicle, VehicleDocument } from "@prisma/client";

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
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
    categoriaOrigem: "MANUAL",
    categoriaRevisaoStatus: "NAO_REQUER",
    categoriaConfiancaIa: null,
    categoriaMotivoIa: null,
    categoriaRevisadaPorId: null,
    categoriaRevisadaEm: null,
    observacoes: null,
    fotoUrl: null,
    status: "DISPONIVEL",
    quilometragemAtual: 1000,
    ultimaLatitude: null,
    ultimaLongitude: null,
    ultimaPosicaoEm: null,
    viagemAtualId: null,
    ultimoMotoristaId: null,
    ultimoMonitorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildDocument(overrides: Partial<VehicleDocument> = {}): VehicleDocument {
  return {
    id: "doc-1",
    vehicleId: "vehicle-1",
    companyId: "company-1",
    maintenanceId: null,
    tipo: "CRLV",
    nomeOriginal: "crlv.pdf",
    mimeType: "application/pdf",
    fileUrl: "https://storage.example.com/crlv.pdf",
    vencimentoEm: null,
    rottaAiStatus: "APROVADO",
    rottaAiQualidadeOk: null,
    rottaAiLegivel: null,
    rottaAiSuspeitaAdulteracao: null,
    rottaAiObservacoes: null,
    rottaAiAnalisadoEm: null,
    uploadedByUserId: "user-1",
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function fullDocumentSet(overrides: Partial<VehicleDocument> = {}): VehicleDocument[] {
  return (["CRLV", "LICENCIAMENTO", "SEGURO", "VISTORIA"] as const).map((tipo) =>
    buildDocument({ id: `doc-${tipo}`, tipo, ...overrides }),
  );
}

describe("computeVerified", () => {
  it("é falso quando a empresa não está ATIVO", () => {
    const vehicle = { ...buildVehicle(), documentos: fullDocumentSet() };
    expect(computeVerified("SUSPENSO", [vehicle])).toBe(false);
  });

  it("é falso quando a empresa não tem nenhum veículo ativo", () => {
    expect(computeVerified("ATIVO", [])).toBe(false);
  });

  it("é verdadeiro quando todos os documentos obrigatórios estão aprovados e não vencidos", () => {
    const vehicle = { ...buildVehicle(), documentos: fullDocumentSet() };
    expect(computeVerified("ATIVO", [vehicle])).toBe(true);
  });

  it("é falso quando falta um dos 4 documentos obrigatórios", () => {
    const incomplete = fullDocumentSet().filter((d) => d.tipo !== "VISTORIA");
    const vehicle = { ...buildVehicle(), documentos: incomplete };
    expect(computeVerified("ATIVO", [vehicle])).toBe(false);
  });

  it("é falso quando um documento obrigatório está vencido", () => {
    const vencido = fullDocumentSet().map((d) =>
      d.tipo === "SEGURO" ? { ...d, vencimentoEm: new Date("2000-01-01") } : d,
    );
    const vehicle = { ...buildVehicle(), documentos: vencido };
    expect(computeVerified("ATIVO", [vehicle])).toBe(false);
  });

  it("é falso quando existe qualquer documento reprovado, mesmo com os obrigatórios em dia", () => {
    const comReprovado = [
      ...fullDocumentSet(),
      buildDocument({ id: "doc-foto", tipo: "FOTO", rottaAiStatus: "REPROVADO" }),
    ];
    const vehicle = { ...buildVehicle(), documentos: comReprovado };
    expect(computeVerified("ATIVO", [vehicle])).toBe(false);
  });

  it("é falso quando um dos vários veículos ativos está irregular", () => {
    const veiculoOk = { ...buildVehicle({ id: "v1" }), documentos: fullDocumentSet() };
    const veiculoIrregular = { ...buildVehicle({ id: "v2" }), documentos: [] };
    expect(computeVerified("ATIVO", [veiculoOk, veiculoIrregular])).toBe(false);
  });
});
