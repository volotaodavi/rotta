import { NotFoundException } from "@nestjs/common";

import { GeoQueueController } from "../geo-queue.controller";

import type { InepSyncService } from "../agents/inep-sync.service";
import type { GeoPipelineService } from "../geo-pipeline.service";

function buildController(geocodeSchool: jest.Mock, sincronizar: jest.Mock = jest.fn()) {
  const geoPipeline = { geocodeSchool } as unknown as GeoPipelineService;
  const inepSync = { sincronizar } as unknown as InepSyncService;
  return new GeoQueueController(geoPipeline, inepSync);
}

describe("GeoQueueController", () => {
  describe("schoolGeocode", () => {
    it("chama GeoPipelineService.geocodeSchool com a escola do job", async () => {
      const geocodeSchool = jest.fn().mockResolvedValue({});
      const controller = buildController(geocodeSchool);

      const resultado = await controller.schoolGeocode({ schoolId: "school-1" });

      expect(geocodeSchool).toHaveBeenCalledWith("school-1");
      expect(resultado).toEqual({ ok: true });
    });

    it("responde ok mesmo com NotFoundException (escola apagada nunca se resolve com retry)", async () => {
      const geocodeSchool = jest
        .fn()
        .mockRejectedValue(new NotFoundException("Escola não encontrada."));
      const controller = buildController(geocodeSchool);

      await expect(controller.schoolGeocode({ schoolId: "school-1" })).resolves.toEqual({
        ok: true,
      });
    });

    it("repropaga outros erros sem convertê-los (QStash tenta de novo)", async () => {
      const geocodeSchool = jest.fn().mockRejectedValue(new Error("timeout de rede"));
      const controller = buildController(geocodeSchool);

      await expect(controller.schoolGeocode({ schoolId: "school-1" })).rejects.toThrow(
        "timeout de rede",
      );
    });
  });

  describe("inepSyncJob", () => {
    it("chama InepSyncService.sincronizar com o ano do job", async () => {
      const sincronizar = jest.fn().mockResolvedValue({});
      const controller = buildController(jest.fn(), sincronizar);

      const resultado = await controller.inepSyncJob({ ano: 2024 });

      expect(sincronizar).toHaveBeenCalledWith(2024);
      expect(resultado).toEqual({ ok: true });
    });
  });
});
