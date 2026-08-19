import { NotFoundException } from "@nestjs/common";

import { GeoQueueController } from "../geo-queue.controller";

import type { InepSyncService } from "../agents/inep-sync.service";
import type { GeoPipelineService } from "../geo-pipeline.service";
import type { SchoolCoordinateRepository } from "../repositories/school-coordinate.repository";
import type { QstashPublisherService } from "@/infra/queue/qstash/qstash-publisher.service";
import type { SchoolCoordinate } from "@prisma/client";

function buildController(options: {
  geocodeSchool?: jest.Mock;
  sincronizar?: jest.Mock;
  listByStatus?: jest.Mock;
  publishBatchJSON?: jest.Mock;
}) {
  const geoPipeline = {
    geocodeSchool: options.geocodeSchool ?? jest.fn(),
  } as unknown as GeoPipelineService;
  const inepSync = { sincronizar: options.sincronizar ?? jest.fn() } as unknown as InepSyncService;
  const coordinateRepository = {
    listByStatus: options.listByStatus ?? jest.fn().mockResolvedValue([]),
  } as unknown as SchoolCoordinateRepository;
  const qstashPublisher = {
    publishBatchJSON: options.publishBatchJSON ?? jest.fn().mockResolvedValue(undefined),
  } as unknown as QstashPublisherService;
  return new GeoQueueController(geoPipeline, inepSync, coordinateRepository, qstashPublisher);
}

function buildCoordinate(overrides: Partial<SchoolCoordinate> = {}): SchoolCoordinate {
  return {
    id: "coordinate-1",
    schoolId: "school-1",
    latitude: -23.561684 as never,
    longitude: -46.655981 as never,
    precisao: "0.3",
    fonte: "NOMINATIM",
    status: "REVISAO_MANUAL",
    tentativa: 3,
    validadoPorIa: false,
    motivoRevisao: "3 tentativas automáticas reprovadas.",
    atual: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GeoQueueController", () => {
  describe("schoolGeocode", () => {
    it("chama GeoPipelineService.geocodeSchool com a escola do job", async () => {
      const geocodeSchool = jest.fn().mockResolvedValue({});
      const controller = buildController({ geocodeSchool });

      const resultado = await controller.schoolGeocode({ schoolId: "school-1" });

      expect(geocodeSchool).toHaveBeenCalledWith("school-1");
      expect(resultado).toEqual({ ok: true });
    });

    it("responde ok mesmo com NotFoundException (escola apagada nunca se resolve com retry)", async () => {
      const geocodeSchool = jest
        .fn()
        .mockRejectedValue(new NotFoundException("Escola não encontrada."));
      const controller = buildController({ geocodeSchool });

      await expect(controller.schoolGeocode({ schoolId: "school-1" })).resolves.toEqual({
        ok: true,
      });
    });

    it("repropaga outros erros sem convertê-los (QStash tenta de novo)", async () => {
      const geocodeSchool = jest.fn().mockRejectedValue(new Error("timeout de rede"));
      const controller = buildController({ geocodeSchool });

      await expect(controller.schoolGeocode({ schoolId: "school-1" })).rejects.toThrow(
        "timeout de rede",
      );
    });
  });

  describe("inepSyncJob", () => {
    it("chama InepSyncService.sincronizar com o ano do job", async () => {
      const sincronizar = jest.fn().mockResolvedValue({});
      const controller = buildController({ sincronizar });

      const resultado = await controller.inepSyncJob({ ano: 2024 });

      expect(sincronizar).toHaveBeenCalledWith(2024);
      expect(resultado).toEqual({ ok: true });
    });
  });

  describe("revisaoManualReprocessJob — achado real: trabalho pesado tirado da requisição HTTP original (408 Request Timeout)", () => {
    it("enumera a fila atual e publica um job SCHOOL_GEOCODE_QUEUE por escola pendente (deduplicada)", async () => {
      const listByStatus = jest
        .fn()
        .mockResolvedValue([
          buildCoordinate({ id: "c1", schoolId: "school-1" }),
          buildCoordinate({ id: "c2", schoolId: "school-2" }),
          buildCoordinate({ id: "c3", schoolId: "school-1" }),
        ]);
      const publishBatchJSON = jest.fn().mockResolvedValue(undefined);
      const controller = buildController({ listByStatus, publishBatchJSON });

      const resultado = await controller.revisaoManualReprocessJob();

      expect(listByStatus).toHaveBeenCalledWith("REVISAO_MANUAL");
      expect(publishBatchJSON).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ route: "geo/school-geocode", body: { schoolId: "school-1" } }),
          expect.objectContaining({ route: "geo/school-geocode", body: { schoolId: "school-2" } }),
        ]),
      );
      const publicados = publishBatchJSON.mock.calls[0][0];
      expect(publicados).toHaveLength(2);
      expect(resultado).toEqual({ ok: true, enfileiradas: 2 });
    });

    it("nunca publica lote vazio quando a fila está vazia", async () => {
      const listByStatus = jest.fn().mockResolvedValue([]);
      const publishBatchJSON = jest.fn();
      const controller = buildController({ listByStatus, publishBatchJSON });

      const resultado = await controller.revisaoManualReprocessJob();

      expect(publishBatchJSON).not.toHaveBeenCalled();
      expect(resultado).toEqual({ ok: true, enfileiradas: 0 });
    });
  });
});
