import { Test } from "@nestjs/testing";

import { LEGAL_DOCUMENT_CATALOG } from "../legal-documents.catalog";
import { LEGAL_DOCUMENT_REPOSITORY } from "../legal-documents.constants";
import { LegalDocumentsService } from "../legal-documents.service";

/**
 * Provisionamento do catálogo no boot (19/09/2026).
 *
 * Isto substituiu o `prisma db seed` que rodava a cada partida do
 * container — ver `legal-documents.catalog.ts` para a medição de cold
 * start que motivou a mudança.
 *
 * O caso mais importante aqui é o do banco fora do ar: um
 * provisionamento de catálogo NUNCA pode derrubar a aplicação inteira.
 * Se derrubar, o conserto de cold start vira uma causa de indisponibilidade,
 * que é exatamente o oposto do objetivo.
 */
describe("LegalDocumentsService — catálogo no boot", () => {
  const criarServico = async (upsert: jest.Mock): Promise<LegalDocumentsService> => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LegalDocumentsService,
        { provide: LEGAL_DOCUMENT_REPOSITORY, useValue: { upsertDocumentBySlug: upsert } },
      ],
    }).compile();

    return moduleRef.get(LegalDocumentsService);
  };

  it("provisiona todo o catálogo", async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const service = await criarServico(upsert);

    await service.onModuleInit();

    expect(upsert).toHaveBeenCalledTimes(LEGAL_DOCUMENT_CATALOG.length);
    for (const documento of LEGAL_DOCUMENT_CATALOG) {
      expect(upsert).toHaveBeenCalledWith(documento);
    }
  });

  it("NÃO derruba a aplicação quando o banco falha no boot", async () => {
    // Banco ainda não aceitando conexão no instante exato da partida é
    // normal. Propagar isso mataria a API inteira por causa de um
    // catálogo.
    const upsert = jest.fn().mockRejectedValue(new Error("banco indisponível"));
    const service = await criarServico(upsert);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it("é idempotente — rodar duas vezes não duplica nada", async () => {
    // `upsertDocumentBySlug` usa o `slug`, que é `@unique`. É o que
    // permite isto rodar a cada boot sem acumular lixo.
    const upsert = jest.fn().mockResolvedValue({});
    const service = await criarServico(upsert);

    await service.onModuleInit();
    await service.onModuleInit();

    expect(upsert).toHaveBeenCalledTimes(LEGAL_DOCUMENT_CATALOG.length * 2);
  });
});

describe("LEGAL_DOCUMENT_CATALOG", () => {
  it("não tem slug repetido", () => {
    const slugs = LEGAL_DOCUMENT_CATALOG.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("cobre os 10 documentos legais publicados", () => {
    expect(LEGAL_DOCUMENT_CATALOG).toHaveLength(10);
  });

  it("todo item tem slug e título preenchidos", () => {
    for (const documento of LEGAL_DOCUMENT_CATALOG) {
      expect(documento.slug.trim()).not.toBe("");
      expect(documento.titulo.trim()).not.toBe("");
    }
  });
});
