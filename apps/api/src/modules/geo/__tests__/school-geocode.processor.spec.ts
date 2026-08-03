import { NotFoundException } from "@nestjs/common";
import { UnrecoverableError, type Job } from "bullmq";

import { SchoolGeocodeProcessor } from "../processors/school-geocode.processor";

import type { GeoPipelineService } from "../geo-pipeline.service";
import type { SchoolGeocodeJobData } from "../processors/school-geocode.processor";

function buildProcessor(geocodeSchool: jest.Mock) {
  const geoPipeline = { geocodeSchool } as unknown as GeoPipelineService;
  return new SchoolGeocodeProcessor(geoPipeline);
}

function buildJob(schoolId: string): Job<SchoolGeocodeJobData> {
  return { data: { schoolId }, attemptsMade: 1 } as Job<SchoolGeocodeJobData>;
}

describe("SchoolGeocodeProcessor", () => {
  it("chama GeoPipelineService.geocodeSchool com a escola do job", async () => {
    const geocodeSchool = jest.fn().mockResolvedValue({});
    const processor = buildProcessor(geocodeSchool);

    await processor.process(buildJob("school-1"));

    expect(geocodeSchool).toHaveBeenCalledWith("school-1");
  });

  it("converte NotFoundException em UnrecoverableError (escola apagada nunca se resolve com retry)", async () => {
    const geocodeSchool = jest
      .fn()
      .mockRejectedValue(new NotFoundException("Escola não encontrada."));
    const processor = buildProcessor(geocodeSchool);

    await expect(processor.process(buildJob("school-1"))).rejects.toThrow(UnrecoverableError);
  });

  it("repropaga outros erros sem convertê-los (permanecem retentáveis pelo BullMQ)", async () => {
    const geocodeSchool = jest.fn().mockRejectedValue(new Error("timeout de rede"));
    const processor = buildProcessor(geocodeSchool);

    await expect(processor.process(buildJob("school-1"))).rejects.toThrow("timeout de rede");
  });
});
