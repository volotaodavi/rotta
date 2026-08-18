import { NominatimRateLimitedException } from "../../geo-engine.service";
import { SchoolCreatedListener } from "../school-created.listener";

import type { GeoPipelineService } from "../../geo-pipeline.service";

function buildGeoPipelineMock(): jest.Mocked<GeoPipelineService> {
  return {
    geocodeSchool: jest.fn(),
  } as unknown as jest.Mocked<GeoPipelineService>;
}

describe("SchoolCreatedListener", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("geocodifica com sucesso de primeira e nunca tenta de novo", async () => {
    const geoPipelineService = buildGeoPipelineMock();
    geoPipelineService.geocodeSchool.mockResolvedValueOnce({} as never);
    const listener = new SchoolCreatedListener(geoPipelineService);

    await listener.handle({ schoolId: "escola-1" });

    expect(geoPipelineService.geocodeSchool).toHaveBeenCalledTimes(1);
  });

  it(// Achado real testando ponta a ponta em produção (Frente AE): uma
  // escola criada enquanto a importação nacional do INEP satura o
  // rate limit do Nominatim ficava sem coordenada pra sempre, sem
  // nenhuma nova tentativa — corrigido com backoff crescente.
  "tenta de novo com backoff quando o Nominatim está sob rate limit, e resolve se a nova tentativa tiver sucesso", async () => {
    const geoPipelineService = buildGeoPipelineMock();
    geoPipelineService.geocodeSchool
      .mockRejectedValueOnce(new NominatimRateLimitedException())
      .mockResolvedValueOnce({} as never);
    const listener = new SchoolCreatedListener(geoPipelineService);

    const promise = listener.handle({ schoolId: "escola-1" });
    await jest.advanceTimersByTimeAsync(5_000);
    await promise;

    expect(geoPipelineService.geocodeSchool).toHaveBeenCalledTimes(2);
  });

  it("desiste após esgotar as tentativas de retry por rate limit (nunca reprocessa pra sempre)", async () => {
    const geoPipelineService = buildGeoPipelineMock();
    geoPipelineService.geocodeSchool.mockRejectedValue(new NominatimRateLimitedException());
    const listener = new SchoolCreatedListener(geoPipelineService);

    const promise = listener.handle({ schoolId: "escola-1" });
    await jest.advanceTimersByTimeAsync(5_000);
    await jest.advanceTimersByTimeAsync(20_000);
    await jest.advanceTimersByTimeAsync(60_000);
    await promise;

    expect(geoPipelineService.geocodeSchool).toHaveBeenCalledTimes(4);
  });

  it("desiste imediatamente (sem retry) quando o erro não é de rate limit", async () => {
    const geoPipelineService = buildGeoPipelineMock();
    geoPipelineService.geocodeSchool.mockRejectedValueOnce(new Error("endereço inválido"));
    const listener = new SchoolCreatedListener(geoPipelineService);

    await listener.handle({ schoolId: "escola-1" });

    expect(geoPipelineService.geocodeSchool).toHaveBeenCalledTimes(1);
  });
});
