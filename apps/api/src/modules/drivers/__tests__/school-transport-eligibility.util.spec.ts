import { computeSchoolTransportEligibility } from "../school-transport-eligibility.util";

import type { DriverDocument, DriverDocumentType, DriverDocumentAiStatus } from "@prisma/client";

function buildDocument(overrides: Partial<DriverDocument> = {}): DriverDocument {
  return {
    id: "document-1",
    userId: "driver-1",
    companyId: "company-1",
    tipo: "CNH",
    numero: null,
    categoria: null,
    nomeOriginal: "doc.jpg",
    mimeType: "image/jpeg",
    fileUrl: "https://storage.test/drivers/driver-1/documents/1.jpg",
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

const NOW = new Date("2026-08-11T12:00:00.000Z");

/** Os 3 documentos exigidos ALÉM da CNH, todos aprovados e sem vencimento — usado como base "tudo certo" nos testes que só variam UM aspecto. */
function buildRequisitosCompletos(
  overrides: Partial<Record<string, Partial<DriverDocument>>> = {},
) {
  return [
    buildDocument({ id: "ear-1", tipo: "EAR" as DriverDocumentType, ...overrides.ear }),
    buildDocument({
      id: "curso-1",
      tipo: "CURSO_TRANSPORTE_ESCOLAR" as DriverDocumentType,
      ...overrides.curso,
    }),
    buildDocument({
      id: "antecedentes-1",
      tipo: "ANTECEDENTES_CRIMINAIS" as DriverDocumentType,
      ...overrides.antecedentes,
    }),
  ];
}

describe("computeSchoolTransportEligibility (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE ESCOLAR)", () => {
  describe("PENDING", () => {
    it("retorna PENDING quando não há nenhuma CNH cadastrada", () => {
      const resultado = computeSchoolTransportEligibility([], NOW);

      expect(resultado.status).toBe("PENDING");
      expect(resultado.categoriaCnh).toBeNull();
    });

    it("retorna PENDING quando a CNH é D mas EAR/curso/antecedentes ainda não foram enviados", () => {
      const documentos = [buildDocument({ categoria: "D" })];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("PENDING");
      expect(resultado.motivo).toContain("EAR");
      expect(resultado.requisitosVerificados.cnhCategoriaValida).toBe(true);
    });
  });

  describe("NOT_ELIGIBLE — categoria B nunca é transporte escolar", () => {
    it("retorna NOT_ELIGIBLE para categoria B, mesmo com EAR e curso presentes", () => {
      const documentos = [buildDocument({ categoria: "B" }), ...buildRequisitosCompletos()];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("NOT_ELIGIBLE");
      expect(resultado.categoriaCnh).toBe("B");
      expect(resultado.requisitosVerificados.cnhCategoriaValida).toBe(false);
    });

    it("normaliza a categoria para maiúsculas antes de comparar", () => {
      const documentos = [buildDocument({ categoria: "b" }), ...buildRequisitosCompletos()];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("NOT_ELIGIBLE");
    });

    it("retorna NOT_ELIGIBLE quando um requisito foi reprovado na análise", () => {
      const documentos = [
        buildDocument({ categoria: "D" }),
        ...buildRequisitosCompletos({
          ear: { rottaAiStatus: "REPROVADO" as DriverDocumentAiStatus },
        }),
      ];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("NOT_ELIGIBLE");
      expect(resultado.motivo).toContain("EAR");
    });
  });

  describe("EXPIRED", () => {
    it("retorna EXPIRED quando um requisito já venceu", () => {
      const documentos = [
        buildDocument({ categoria: "E" }),
        ...buildRequisitosCompletos({
          curso: { vencimentoEm: new Date("2026-01-01T00:00:00.000Z") },
        }),
      ];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("EXPIRED");
    });
  });

  describe("UNDER_REVIEW", () => {
    it("retorna UNDER_REVIEW quando um requisito ainda está em análise", () => {
      const documentos = [
        buildDocument({ categoria: "D" }),
        ...buildRequisitosCompletos({
          antecedentes: { rottaAiStatus: "PENDENTE" as DriverDocumentAiStatus },
        }),
      ];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("UNDER_REVIEW");
    });
  });

  describe("REQUIRES_UPDATE", () => {
    it("retorna REQUIRES_UPDATE quando um requisito vence nos próximos 30 dias", () => {
      const documentos = [
        buildDocument({ categoria: "D" }),
        ...buildRequisitosCompletos({
          ear: { vencimentoEm: new Date("2026-08-20T00:00:00.000Z") },
        }),
      ];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("REQUIRES_UPDATE");
    });
  });

  describe("ELIGIBLE", () => {
    it("retorna ELIGIBLE só quando categoria D/E + todos os requisitos aprovados e válidos", () => {
      const documentos = [
        buildDocument({ categoria: "D" }),
        ...buildRequisitosCompletos({
          ear: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
          curso: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
          antecedentes: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
        }),
      ];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("ELIGIBLE");
      expect(resultado.categoriaCnh).toBe("D");
      expect(resultado.requisitosVerificados).toEqual({
        cnhCategoriaValida: true,
        ear: true,
        cursoTransporteEscolar: true,
        antecedentesCriminais: true,
      });
    });

    it("categoria E também é elegível", () => {
      const documentos = [
        buildDocument({ categoria: "E" }),
        ...buildRequisitosCompletos({
          ear: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
          curso: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
          antecedentes: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
        }),
      ];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.status).toBe("ELIGIBLE");
    });
  });

  describe("documento mais recente por tipo", () => {
    it("usa só a CNH mais recente (primeira do array, já ordenado desc pelo repository)", () => {
      const documentos = [
        buildDocument({ id: "cnh-nova", categoria: "D", createdAt: new Date("2026-06-01") }),
        buildDocument({ id: "cnh-antiga", categoria: "B", createdAt: new Date("2025-01-01") }),
        ...buildRequisitosCompletos({
          ear: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
          curso: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
          antecedentes: { vencimentoEm: new Date("2027-01-01T00:00:00.000Z") },
        }),
      ];

      const resultado = computeSchoolTransportEligibility(documentos, NOW);

      expect(resultado.categoriaCnh).toBe("D");
      expect(resultado.status).toBe("ELIGIBLE");
    });
  });
});
