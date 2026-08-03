import { BadGatewayException } from "@nestjs/common";

import { InepSyncService } from "../agents/inep-sync.service";
import { INEP_COLUMNS } from "../inep/inep-row.mapper";

import type { GeoPipelineService } from "../geo-pipeline.service";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { School } from "@prisma/client";

function buildSchool(overrides: Partial<School> = {}): School {
  return {
    id: "school-1",
    codigoInterno: "ESC-000001",
    codigoInep: "35000123",
    nomeOficial: "EMEF Professora Ana Souza",
    nomeFantasia: null,
    redeEnsino: null,
    dependenciaAdministrativa: "MUNICIPAL",
    cnpj: null,
    telefone: null,
    whatsapp: null,
    email: null,
    website: null,
    cep: "01310-100",
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
    origemCadastro: "SYNC_INEP",
    criadoPorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function csvRow(fields: Record<string, string>): string {
  return Object.values(fields).join(";");
}

function buildCsv(rows: Record<string, string>[]): string {
  const header = Object.keys(INEP_COLUMNS).map(
    (key) => INEP_COLUMNS[key as keyof typeof INEP_COLUMNS],
  );
  const linhas = rows.map((row) => csvRow(row));
  return [header.join(";"), ...linhas].join("\n");
}

function buildInepRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
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

describe("InepSyncService", () => {
  function buildService(schoolRepositoryOverrides: Partial<jest.Mocked<SchoolRepository>> = {}) {
    const schoolRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCodigoInep: jest.fn(),
      findManyByCodigosInep: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      list: jest.fn(),
      listAllActive: jest.fn(),
      nextCodigoInternoSequence: jest.fn().mockResolvedValue(1),
      ...schoolRepositoryOverrides,
    } as unknown as jest.Mocked<SchoolRepository>;

    const geoPipeline = {
      geocodeSchool: jest.fn().mockResolvedValue({}),
      resolveManualReview: jest.fn(),
    } as unknown as jest.Mocked<GeoPipelineService>;

    const service = new InepSyncService(schoolRepository, geoPipeline);
    return { service, schoolRepository, geoPipeline };
  }

  describe("sincronizarDeCsv", () => {
    it("cria uma escola nova e dispara o Rotta Geo Engine (via GeoPipelineService) para geocodificá-la", async () => {
      const { service, schoolRepository, geoPipeline } = buildService();
      schoolRepository.create.mockResolvedValue(buildSchool());
      const csv = buildCsv([buildInepRow()]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo).toMatchObject({ novas: 1, atualizadas: 0, inalteradas: 0, ignoradas: 0 });
      expect(resumo.erros).toEqual([]);
      expect(schoolRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          codigoInep: "35000123",
          origemCadastro: "SYNC_INEP",
          status: "EM_ANALISE",
        }),
      );
      expect(geoPipeline.geocodeSchool).toHaveBeenCalledWith("school-1");
    });

    it("atualiza e regeocodifica quando o endereço da escola já existente mudou", async () => {
      const existente = buildSchool({ logradouro: "Rua Antiga", numero: "1" });
      const { service, schoolRepository, geoPipeline } = buildService({
        findManyByCodigosInep: jest.fn().mockResolvedValue([existente]),
      });
      schoolRepository.update.mockResolvedValue(buildSchool());
      const csv = buildCsv([buildInepRow()]); // logradouro "Avenida Paulista" != "Rua Antiga"

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo).toMatchObject({ novas: 0, atualizadas: 1, inalteradas: 0 });
      expect(schoolRepository.update).toHaveBeenCalledWith(
        existente.id,
        expect.objectContaining({ logradouro: "Avenida Paulista" }),
      );
      expect(geoPipeline.geocodeSchool).toHaveBeenCalledWith(existente.id);
      expect(schoolRepository.create).not.toHaveBeenCalled();
    });

    it("não mexe (nem regeocodifica) quando o endereço já existente é idêntico ao do Censo", async () => {
      const existente = buildSchool();
      const { service, schoolRepository, geoPipeline } = buildService({
        findManyByCodigosInep: jest.fn().mockResolvedValue([existente]),
      });
      const csv = buildCsv([buildInepRow()]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo).toMatchObject({ novas: 0, atualizadas: 0, inalteradas: 1 });
      expect(schoolRepository.update).not.toHaveBeenCalled();
      expect(geoPipeline.geocodeSchool).not.toHaveBeenCalled();
    });

    it("ignora escolas fora de atividade sem contar como erro", async () => {
      const { service } = buildService();
      const csv = buildCsv([buildInepRow({ [INEP_COLUMNS.situacaoFuncionamento]: "2" })]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo).toMatchObject({ novas: 0, ignoradas: 1, erros: [] });
    });

    it("acumula erro de mapeamento sem abortar as demais linhas do CSV", async () => {
      const { service, schoolRepository } = buildService();
      schoolRepository.create.mockResolvedValue(buildSchool());
      const csv = buildCsv([
        buildInepRow({ [INEP_COLUMNS.codigoInep]: "" }),
        buildInepRow({ [INEP_COLUMNS.codigoInep]: "35000124" }),
      ]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo.novas).toBe(1);
      expect(resumo.erros).toHaveLength(1);
    });

    it("registra falha de geocodificação de uma escola sem derrubar a sincronização inteira", async () => {
      const { service, schoolRepository, geoPipeline } = buildService();
      schoolRepository.create.mockResolvedValue(buildSchool());
      (geoPipeline.geocodeSchool as jest.Mock).mockRejectedValueOnce(
        new BadGatewayException("Mapbox indisponível"),
      );
      const csv = buildCsv([buildInepRow()]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo.novas).toBe(1);
      expect(resumo.erros).toHaveLength(1);
      expect(resumo.erros[0]?.mensagem).toContain("Falha ao geocodificar");
    });
  });

  describe("sincronizar", () => {
    it("lança BadGatewayException quando o download do Censo Escolar falha (INEP fora do ar/bloqueio de rede)", async () => {
      const { service } = buildService();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      await expect(service.sincronizar(2024)).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException quando a rede está indisponível (fetch rejeita)", async () => {
      const { service } = buildService();
      global.fetch = jest.fn().mockRejectedValue(new Error("network unreachable"));

      await expect(service.sincronizar(2024)).rejects.toThrow(BadGatewayException);
    });
  });
});
