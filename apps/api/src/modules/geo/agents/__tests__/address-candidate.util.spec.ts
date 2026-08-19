import { buildAddressCandidate, buildMunicipioFallback } from "../address-candidate.util";

import type { School } from "@prisma/client";

function buildSchool(overrides: Partial<School> = {}): School {
  return {
    id: "school-1",
    codigoInterno: "ESC-000001",
    codigoInep: null,
    nomeOficial: "EMEF Professora Ana Souza",
    nomeFantasia: null,
    redeEnsino: null,
    dependenciaAdministrativa: "MUNICIPAL",
    cnpj: null,
    telefone: null,
    whatsapp: null,
    email: null,
    website: null,
    cep: "01310100",
    logradouro: "Avenida Paulista",
    numero: "1000",
    complemento: null,
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    pais: "Brasil",
    latitude: null,
    longitude: null,
    observacoesLocalizacao: null,
    tipos: ["FUNDAMENTAL"],
    turnosAtendidos: ["MANHA"],
    status: "ATIVA",
    origemCadastro: "MANUAL",
    criadoPorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("buildAddressCandidate — escada de simplificação (achado real: reprocessar repetia a mesma pergunta 3x)", () => {
  it("tentativa 1: endereço completo, com número, bairro e CEP", () => {
    expect(buildAddressCandidate(buildSchool(), 1)).toBe(
      "Avenida Paulista, 1000, Bela Vista, São Paulo - SP, 01310100",
    );
  });

  it("tentativa 2: sem número e sem CEP", () => {
    const candidato = buildAddressCandidate(buildSchool(), 2);
    expect(candidato).toBe("Avenida Paulista, Bela Vista, São Paulo - SP");
    expect(candidato).not.toContain("1000");
  });

  it("tentativa 3: sem número e sem bairro (só logradouro + cidade)", () => {
    const candidato = buildAddressCandidate(buildSchool(), 3);
    expect(candidato).toBe("Avenida Paulista, São Paulo - SP");
    expect(candidato).not.toContain("Bela Vista");
  });

  it("as 3 tentativas produzem strings diferentes entre si (nunca repete a mesma pergunta ao Nominatim)", () => {
    const school = buildSchool();
    const t1 = buildAddressCandidate(school, 1);
    const t2 = buildAddressCandidate(school, 2);
    const t3 = buildAddressCandidate(school, 3);
    expect(new Set([t1, t2, t3]).size).toBe(3);
  });

  it("tentativa acima de 3 continua devolvendo a variante mais simplificada (nunca lança)", () => {
    expect(buildAddressCandidate(buildSchool(), 4)).toBe(buildAddressCandidate(buildSchool(), 3));
  });
});

describe("buildMunicipioFallback", () => {
  it("monta só cidade - estado, Brasil — nunca inclui logradouro/número/bairro", () => {
    const fallback = buildMunicipioFallback(buildSchool());
    expect(fallback).toBe("São Paulo - SP, Brasil");
    expect(fallback).not.toContain("Avenida Paulista");
    expect(fallback).not.toContain("Bela Vista");
  });
});
