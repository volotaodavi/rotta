import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ReceitaFederalService } from "../receita-federal.service";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const CNPJ_VALIDO = "19131243000197";

describe("ReceitaFederalService", () => {
  const originalFetch = global.fetch;
  let service: ReceitaFederalService;

  beforeEach(() => {
    service = new ReceitaFederalService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("normaliza a resposta da BrasilAPI pros campos que o cadastro precisa", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        cnpj: CNPJ_VALIDO,
        razao_social: "OPEN KNOWLEDGE BRASIL",
        nome_fantasia: "REDE PELO CONHECIMENTO LIVRE",
        descricao_situacao_cadastral: "ATIVA",
        cep: "01311902",
        logradouro: "PAULISTA 37",
        numero: "37",
        complemento: "ANDAR 4",
        bairro: "BELA VISTA",
        municipio: "SAO PAULO",
        uf: "SP",
      }),
    );

    const result = await service.lookupCnpj(CNPJ_VALIDO);

    expect(result).toEqual({
      cnpj: CNPJ_VALIDO,
      razaoSocial: "OPEN KNOWLEDGE BRASIL",
      nomeFantasia: "REDE PELO CONHECIMENTO LIVRE",
      situacaoCadastral: "ATIVA",
      cep: "01311902",
      endereco: "PAULISTA 37",
      numero: "37",
      complemento: "ANDAR 4",
      bairro: "BELA VISTA",
      cidade: "SAO PAULO",
      estado: "SP",
    });
    expect(service.isAtiva(result)).toBe(true);
  });

  it("isAtiva devolve false para situação diferente de ATIVA (ex. BAIXADA)", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        cnpj: CNPJ_VALIDO,
        razao_social: "EMPRESA BAIXADA LTDA",
        nome_fantasia: null,
        descricao_situacao_cadastral: "BAIXADA",
        cep: null,
        logradouro: null,
        numero: null,
        complemento: null,
        bairro: null,
        municipio: null,
        uf: null,
      }),
    );

    const result = await service.lookupCnpj(CNPJ_VALIDO);

    expect(service.isAtiva(result)).toBe(false);
    // nome_fantasia ausente cai pro razao_social — nunca fica vazio no formulário.
    expect(result.nomeFantasia).toBe("EMPRESA BAIXADA LTDA");
  });

  it("lança NotFoundException quando a BrasilAPI devolve 404", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 404));

    await expect(service.lookupCnpj("00000000000000")).rejects.toThrow(NotFoundException);
  });

  it("lança BadRequestException quando a BrasilAPI devolve outro erro HTTP", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    await expect(service.lookupCnpj(CNPJ_VALIDO)).rejects.toThrow(BadRequestException);
  });

  it("lança BadRequestException (nunca deixa vazar) quando a rede falha", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(service.lookupCnpj(CNPJ_VALIDO)).rejects.toThrow(BadRequestException);
  });
});
