import { VehicleCategory, VehicleType } from "@prisma/client";

import {
  VEHICLE_CATEGORY_CONFIDENCE_THRESHOLD,
  VehicleCategoryClassifierService,
} from "../vehicle-category-classifier.service";

describe("VehicleCategoryClassifierService", () => {
  const service = new VehicleCategoryClassifierService();

  describe("carros de passeio (AUTOMOVEL/SEDAN/SUV/MINIVAN) — nunca elegíveis pra escolar (CTB Art. 136)", () => {
    it.each([VehicleType.AUTOMOVEL, VehicleType.SEDAN, VehicleType.SUV, VehicleType.MINIVAN])(
      "classifica %s como EXECUTIVO com confiança alta (acima do limiar, não pede revisão)",
      (tipo) => {
        const result = service.classify(tipo, 5);

        expect(result.categoria).toBe(VehicleCategory.EXECUTIVO);
        expect(result.confianca).toBeGreaterThanOrEqual(VEHICLE_CATEGORY_CONFIDENCE_THRESHOLD);
        expect(result.motivo).toContain(tipo.toLowerCase());
        expect(result.motivo.toLowerCase()).toContain("ctb");
      },
    );
  });

  describe("carroceria coletiva (VAN/MICRO_ONIBUS/ONIBUS) — ambíguo entre escolar e fretamento", () => {
    it.each([VehicleType.VAN, VehicleType.MICRO_ONIBUS, VehicleType.ONIBUS])(
      "classifica %s como ESCOLAR com confiança abaixo do limiar (pede revisão)",
      (tipo) => {
        const result = service.classify(tipo, 20);

        expect(result.categoria).toBe(VehicleCategory.ESCOLAR);
        expect(result.confianca).toBeLessThan(VEHICLE_CATEGORY_CONFIDENCE_THRESHOLD);
        expect(result.motivo).toContain(tipo.toLowerCase());
      },
    );
  });

  it("classifica OUTRO como ESCOLAR com confiança baixa (sempre pede revisão)", () => {
    const result = service.classify(VehicleType.OUTRO, 10);

    expect(result.categoria).toBe(VehicleCategory.ESCOLAR);
    expect(result.confianca).toBeLessThan(VEHICLE_CATEGORY_CONFIDENCE_THRESHOLD);
    expect(result.motivo.toLowerCase()).toContain("outro");
  });

  it("nunca devolve confiança fora do intervalo 0-100 pra nenhum VehicleType conhecido", () => {
    for (const tipo of Object.values(VehicleType)) {
      const result = service.classify(tipo, 15);
      expect(result.confianca).toBeGreaterThanOrEqual(0);
      expect(result.confianca).toBeLessThanOrEqual(100);
    }
  });

  it("sempre devolve um motivo legível (nunca vazio) — nunca um valor 'mágico' sem explicação", () => {
    for (const tipo of Object.values(VehicleType)) {
      const result = service.classify(tipo, 15);
      expect(result.motivo.length).toBeGreaterThan(0);
    }
  });

  it("interpola a capacidade de passageiros informada no motivo", () => {
    const result = service.classify(VehicleType.SEDAN, 4);
    expect(result.motivo).toContain("4 lugares");
  });
});
