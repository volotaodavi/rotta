import { mapRowToCreateSchoolData, type ImportRow } from "../school-import.util";

/**
 * Cobre especificamente o suporte a `latitude`/`longitude` na
 * importação em massa (adicionado para a importação do Catálogo de
 * Escolas anônimo do INEP, que já publica coordenada por escola) — o
 * resto de `mapRowToCreateSchoolData` já é coberto indiretamente via
 * `schools.service.spec.ts`.
 */
describe("school-import.util — parseLatLong", () => {
  const baseRow: ImportRow = {
    nomeOficial: "EMEF Teste",
    dependenciaAdministrativa: "MUNICIPAL",
    cep: "76800-000",
    logradouro: "Rua Teste",
    numero: "100",
    bairro: "Centro",
    cidade: "Porto Velho",
    estado: "RO",
    tipos: "FUNDAMENTAL",
    turnosAtendidos: "MANHA",
  };

  it("usa latitude/longitude quando ambas presentes e dentro do Brasil", () => {
    const result = mapRowToCreateSchoolData({
      ...baseRow,
      latitude: "-8.7607343",
      longitude: "-63.9019859",
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.latitude).toBeCloseTo(-8.7607343);
    expect(result.data?.longitude).toBeCloseTo(-63.9019859);
  });

  it("ignora coordenada fora do bounding box aproximado do Brasil", () => {
    const result = mapRowToCreateSchoolData({
      ...baseRow,
      latitude: "48.8566", // Paris
      longitude: "2.3522",
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.latitude).toBeUndefined();
    expect(result.data?.longitude).toBeUndefined();
  });

  it("ignora quando só uma das duas colunas está presente", () => {
    const result = mapRowToCreateSchoolData({ ...baseRow, latitude: "-8.76" });
    expect(result.data?.latitude).toBeUndefined();
    expect(result.data?.longitude).toBeUndefined();
  });

  it("ignora valor não numérico sem quebrar a linha", () => {
    const result = mapRowToCreateSchoolData({
      ...baseRow,
      latitude: "não informado",
      longitude: "não informado",
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.latitude).toBeUndefined();
    expect(result.data?.longitude).toBeUndefined();
  });

  it("segue sem latitude/longitude quando as colunas não existem (caso comum)", () => {
    const result = mapRowToCreateSchoolData(baseRow);
    expect(result.error).toBeUndefined();
    expect(result.data?.latitude).toBeUndefined();
    expect(result.data?.longitude).toBeUndefined();
  });
});
