import { BadGatewayException } from "@nestjs/common";
import AdmZip from "adm-zip";

import {
  DOWNLOAD_RETRY_ATTEMPTS,
  DOWNLOAD_RETRY_DELAY_MS,
  FALLBACK_ANOS_ANTERIORES,
  InepSyncService,
} from "../agents/inep-sync.service";
import { INEP_COLUMNS } from "../inep/inep-row.mapper";

import type { RedisService } from "@/infra/cache/redis.service";
import type { QstashPublisherService } from "@/infra/queue/qstash/qstash-publisher.service";
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

    const qstashPublisher = {
      publishJSON: jest.fn().mockResolvedValue("message-1"),
      publishBatchJSON: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<QstashPublisherService>;

    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn(),
      getOrSet: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const service = new InepSyncService(schoolRepository, qstashPublisher, redis);
    return { service, schoolRepository, qstashPublisher, redis };
  }

  describe("sincronizarDeCsv", () => {
    it("cria uma escola nova e publica um job de geocodificação via QStash", async () => {
      const { service, schoolRepository, qstashPublisher } = buildService();
      schoolRepository.create.mockResolvedValue(buildSchool());
      const csv = buildCsv([buildInepRow()]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo).toMatchObject({
        novas: 1,
        atualizadas: 0,
        inalteradas: 0,
        ignoradas: 0,
        enfileiradasParaGeocodificacao: 1,
      });
      expect(resumo.erros).toEqual([]);
      expect(schoolRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          codigoInep: "35000123",
          origemCadastro: "SYNC_INEP",
          status: "EM_ANALISE",
        }),
      );
      expect(qstashPublisher.publishBatchJSON).toHaveBeenCalledWith([
        expect.objectContaining({
          route: "geo/school-geocode",
          body: { schoolId: "school-1" },
        }),
      ]);
    });

    it("atualiza e republica geocodificação quando o endereço da escola já existente mudou", async () => {
      const existente = buildSchool({ logradouro: "Rua Antiga", numero: "1" });
      const { service, schoolRepository, qstashPublisher } = buildService({
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
      expect(qstashPublisher.publishBatchJSON).toHaveBeenCalledWith([
        expect.objectContaining({
          route: "geo/school-geocode",
          body: { schoolId: existente.id },
        }),
      ]);
      expect(schoolRepository.create).not.toHaveBeenCalled();
    });

    it("não mexe (nem republica geocodificação) quando o endereço já existente é idêntico ao do Censo", async () => {
      const existente = buildSchool();
      const { service, schoolRepository, qstashPublisher } = buildService({
        findManyByCodigosInep: jest.fn().mockResolvedValue([existente]),
      });
      const csv = buildCsv([buildInepRow()]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo).toMatchObject({
        novas: 0,
        atualizadas: 0,
        inalteradas: 1,
        enfileiradasParaGeocodificacao: 0,
      });
      expect(schoolRepository.update).not.toHaveBeenCalled();
      expect(qstashPublisher.publishBatchJSON).not.toHaveBeenCalled();
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

    it("publica um único lote (publishBatchJSON) para múltiplas escolas novas/alteradas na mesma sincronização", async () => {
      const { service, schoolRepository, qstashPublisher } = buildService();
      schoolRepository.create.mockResolvedValue(buildSchool());
      const csv = buildCsv([
        buildInepRow(),
        buildInepRow({ [INEP_COLUMNS.codigoInep]: "35000124" }),
      ]);

      const resumo = await service.sincronizarDeCsv(2024, csv);

      expect(resumo.novas).toBe(2);
      expect(resumo.enfileiradasParaGeocodificacao).toBe(2);
      expect(qstashPublisher.publishBatchJSON).toHaveBeenCalledTimes(1);
      expect((qstashPublisher.publishBatchJSON as jest.Mock).mock.calls[0][0]).toHaveLength(2);
    });
  });

  describe("sincronizar", () => {
    it("lança BadGatewayException quando o download do Censo Escolar falha (INEP fora do ar/bloqueio de rede)", async () => {
      const { service } = buildService();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      await expect(service.sincronizar(2024)).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException após esgotar as tentativas quando a rede está indisponível (fetch sempre rejeita)", async () => {
      jest.useFakeTimers();
      try {
        const { service } = buildService();
        const fetchMock = jest.fn().mockRejectedValue(new Error("network unreachable"));
        global.fetch = fetchMock;

        // `expect(...).rejects` já anexa o handler de rejeição
        // sincronamente, antes de qualquer `await` — evita que o Node
        // veja a promise como rejeição não tratada enquanto os timers
        // avançam logo abaixo.
        const expectativa = expect(service.sincronizar(2024)).rejects.toThrow(BadGatewayException);
        // Deixa as rejeições/retries encadeados avançarem sem esperar o
        // tempo real de `DOWNLOAD_RETRY_DELAY_MS` entre cada tentativa.
        await jest.advanceTimersByTimeAsync(DOWNLOAD_RETRY_DELAY_MS * DOWNLOAD_RETRY_ATTEMPTS);

        await expectativa;
        expect(fetchMock).toHaveBeenCalledTimes(DOWNLOAD_RETRY_ATTEMPTS);
      } finally {
        jest.useRealTimers();
      }
    });

    it("não tenta de novo quando o INEP responde com um HTTP não-ok (determinístico, ex. 404 de ano ainda não publicado)", async () => {
      const { service } = buildService();
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 404 });
      global.fetch = fetchMock;

      await expect(service.sincronizar(2025)).rejects.toThrow(BadGatewayException);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("recupera numa tentativa seguinte quando só as primeiras falham por rede", async () => {
      jest.useFakeTimers();
      try {
        const { service, redis } = buildService();
        const zip = new AdmZip();
        zip.addFile("escolas.csv", Buffer.from(buildCsv([buildInepRow()]), "latin1"));
        const fetchMock = jest
          .fn()
          .mockRejectedValueOnce(new Error("ECONNRESET"))
          .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(zip.toBuffer()) });
        global.fetch = fetchMock;

        const promise = service.sincronizar(2024);
        await jest.advanceTimersByTimeAsync(DOWNLOAD_RETRY_DELAY_MS);

        const resumo = await promise;

        expect(resumo.novas).toBe(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(redis.set).toHaveBeenCalledWith(
          "geo:inep-sync:status",
          expect.objectContaining({ ano: 2024, sucesso: true }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it("registra sucesso no Redis (getStatus) quando a sincronização termina bem", async () => {
      const { service, redis } = buildService();
      const zip = new AdmZip();
      zip.addFile("escolas.csv", Buffer.from(buildCsv([buildInepRow()]), "latin1"));
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(zip.toBuffer()),
      });

      const resumo = await service.sincronizar(2024);

      expect(resumo.novas).toBe(1);
      expect(redis.set).toHaveBeenCalledWith(
        "geo:inep-sync:status",
        expect.objectContaining({ ano: 2024, sucesso: true, resumo }),
      );
    });

    it("registra a falha no Redis (getStatus) sem deixar de relançar o erro", async () => {
      const { service, redis } = buildService();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      await expect(service.sincronizar(2024)).rejects.toThrow(BadGatewayException);
      expect(redis.set).toHaveBeenCalledWith(
        "geo:inep-sync:status",
        expect.objectContaining({ ano: 2024, sucesso: false }),
      );
    });
  });

  describe("sincronizarComFallbackDeAno", () => {
    it("usa o ano preferido direto quando ele funciona (sem tentar nenhum ano anterior)", async () => {
      const { service } = buildService();
      const zip = new AdmZip();
      zip.addFile("escolas.csv", Buffer.from(buildCsv([buildInepRow()]), "latin1"));
      const fetchMock = jest
        .fn()
        .mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(zip.toBuffer()) });
      global.fetch = fetchMock;

      const resumo = await service.sincronizarComFallbackDeAno(2025);

      expect(resumo.ano).toBe(2025);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("microdados_censo_escolar_2025.zip"),
        expect.anything(),
      );
    });

    it("cai pro ano anterior quando o ano preferido devolve 404 (Censo ainda não publicado)", async () => {
      const { service } = buildService();
      const zip = new AdmZip();
      zip.addFile("escolas.csv", Buffer.from(buildCsv([buildInepRow()]), "latin1"));
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 404 }) // 2025
        .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(zip.toBuffer()) }); // 2024
      global.fetch = fetchMock;

      const resumo = await service.sincronizarComFallbackDeAno(2025);

      expect(resumo.ano).toBe(2024);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("2025.zip"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("2024.zip"),
        expect.anything(),
      );
    });

    it("relança o erro do último ano tentado quando TODOS os anos falharem", async () => {
      const { service } = buildService();
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 404 });
      global.fetch = fetchMock;

      await expect(service.sincronizarComFallbackDeAno(2025)).rejects.toThrow(BadGatewayException);
      // ano preferido + FALLBACK_ANOS_ANTERIORES anos anteriores.
      expect(fetchMock).toHaveBeenCalledTimes(FALLBACK_ANOS_ANTERIORES + 1);
    });
  });

  describe("getStatus", () => {
    it("devolve o último status salvo no Redis", async () => {
      const { service, redis } = buildService();
      const status = { ano: 2024, executadoEm: "2024-01-01T00:00:00.000Z", sucesso: true };
      (redis.get as jest.Mock).mockResolvedValue(status);

      await expect(service.getStatus()).resolves.toEqual(status);
    });

    it("devolve null quando a sincronização nunca rodou neste ambiente", async () => {
      const { service } = buildService();

      await expect(service.getStatus()).resolves.toBeNull();
    });
  });
});
