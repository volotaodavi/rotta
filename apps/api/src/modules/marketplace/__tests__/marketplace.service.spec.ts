import { NotFoundException } from "@nestjs/common";

import { MarketplaceService } from "../marketplace.service";

import type { SearchTransportersQueryDto } from "../dto/search-transporters-query.dto";
import type {
  TransporterCandidate,
  TransporterRepository,
} from "../repositories/transporter.repository";
import type { Company, Plan, Rating, Vehicle, VehicleDocument } from "@prisma/client";

function buildPlan(): Plan {
  return {
    id: "plan-1",
    code: "starter",
    name: "Starter",
    priceCents: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildCompany(overrides: Partial<Company> = {}): Company & { plan: Plan } {
  return {
    id: "company-1",
    razaoSocial: "Transporte Escolar LTDA",
    nomeFantasia: "TransEscolar",
    cpfCnpj: "11222333000181",
    tipo: "LTDA",
    email: "contato@transescolar.com",
    telefone: "11999999999",
    whatsapp: null,
    cep: "01310100",
    endereco: "Avenida Paulista",
    numero: "900",
    complemento: null,
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    latitude: "-23.561684" as unknown as Company["latitude"],
    longitude: "-46.655981" as unknown as Company["longitude"],
    logoUrl: null,
    fotoUrl: null,
    corPrimaria: "#3B6EF6",
    idioma: "pt-BR",
    fusoHorario: "America/Sao_Paulo",
    status: "ATIVO",
    planId: "plan-1",
    abacatepaySubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    plan: buildPlan(),
    ...overrides,
  };
}

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "vehicle-1",
    companyId: "company-1",
    placa: "ABC1D23",
    modelo: "Sprinter",
    marca: "Mercedes",
    ano: 2020,
    cor: "Branco",
    renavam: null,
    chassi: null,
    capacidadePassageiros: 20,
    tipo: "VAN",
    categoria: "ESCOLAR",
    observacoes: null,
    fotoUrl: null,
    status: "DISPONIVEL",
    quilometragemAtual: 1000,
    ultimaLatitude: null,
    ultimaLongitude: null,
    ultimaPosicaoEm: null,
    viagemAtualId: null,
    ultimoMotoristaId: null,
    ultimoMonitorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<TransporterCandidate> = {}): TransporterCandidate {
  return {
    company: buildCompany(),
    veiculosAtivos: [{ ...buildVehicle(), documentos: [] as VehicleDocument[] }],
    alunosTransportadosIds: [],
    ratings: [] as Pick<Rating, "nota">[],
    mensalidadesAtivasCentavos: [],
    ...overrides,
  };
}

function buildQuery(
  overrides: Partial<SearchTransportersQueryDto> = {},
): SearchTransportersQueryDto {
  return {
    latitude: -23.561684,
    longitude: -46.655981,
    sortBy: "distancia",
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

describe("MarketplaceService", () => {
  let service: MarketplaceService;
  let transporterRepository: jest.Mocked<TransporterRepository>;

  beforeEach(() => {
    transporterRepository = {
      searchCandidates: jest.fn(),
      findCandidateById: jest.fn(),
      findCandidateByCodigoInterno: jest.fn(),
      listRecentRatingsForCompany: jest.fn(),
      listActiveSchoolsForCompany: jest.fn().mockResolvedValue([]),
      listPublicTeamForCompany: jest.fn().mockResolvedValue([]),
      computeAverageResponseHours: jest.fn().mockResolvedValue(null),
    };
    service = new MarketplaceService(transporterRepository);
  });

  describe("search", () => {
    it("calcula a distância até cada candidato (mesmas coordenadas => ~0km)", async () => {
      transporterRepository.searchCandidates.mockResolvedValue([buildCandidate()]);

      const result = await service.search(buildQuery());

      expect(result.items).toHaveLength(1);
      expect(result.items[0].distanciaKm).toBeCloseTo(0, 1);
    });

    it("expõe categoriasVeiculo no card (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE ESCOLAR)", async () => {
      transporterRepository.searchCandidates.mockResolvedValue([buildCandidate()]);

      const result = await service.search(buildQuery());

      expect(result.items[0].categoriasVeiculo).toEqual(["ESCOLAR"]);
    });

    it("escolarVerificado é false quando o veículo ESCOLAR não tem motorista vinculado, mesmo com categoriasVeiculo=[ESCOLAR] (achado C1)", async () => {
      transporterRepository.searchCandidates.mockResolvedValue([buildCandidate()]);

      const result = await service.search(buildQuery());

      expect(result.items[0].categoriasVeiculo).toEqual(["ESCOLAR"]);
      expect(result.items[0].escolarVerificado).toBe(false);
    });

    it("repassa categoriaVeiculo para o repositório, junto dos demais filtros da query SQL", async () => {
      transporterRepository.searchCandidates.mockResolvedValue([]);

      await service.search(
        buildQuery({ categoriaVeiculo: "ESCOLAR", tipoVeiculo: "VAN", escolaId: "school-1" }),
      );

      expect(transporterRepository.searchCandidates).toHaveBeenCalledWith(
        expect.objectContaining({
          categoriaVeiculo: "ESCOLAR",
          tipoVeiculo: "VAN",
          escolaId: "school-1",
        }),
      );
    });

    it("exclui candidatos fora do raioKm", async () => {
      const longe = buildCandidate({
        company: buildCompany({
          id: "company-longe",
          latitude: "-3.7327" as unknown as Company["latitude"],
          longitude: "-38.5267" as unknown as Company["longitude"],
        }),
      });
      transporterRepository.searchCandidates.mockResolvedValue([buildCandidate(), longe]);

      const result = await service.search(buildQuery({ raioKm: 50 }));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("company-1");
      expect(result.total).toBe(1);
    });

    it("exclui candidatos com avaliação abaixo de avaliacaoMin (e sem avaliação nenhuma)", async () => {
      const semNota = buildCandidate({ company: buildCompany({ id: "sem-nota" }), ratings: [] });
      const notaBaixa = buildCandidate({
        company: buildCompany({ id: "nota-baixa" }),
        ratings: [{ nota: 2 }],
      });
      const notaAlta = buildCandidate({
        company: buildCompany({ id: "nota-alta" }),
        ratings: [{ nota: 5 }, { nota: 4 }],
      });
      transporterRepository.searchCandidates.mockResolvedValue([semNota, notaBaixa, notaAlta]);

      const result = await service.search(buildQuery({ avaliacaoMin: 4 }));

      expect(result.items.map((i) => i.id)).toEqual(["nota-alta"]);
    });

    it("mantém candidatos sem mensalidade conhecida, exclui só os que excedem o teto", async () => {
      const semPreco = buildCandidate({ company: buildCompany({ id: "sem-preco" }) });
      const caro = buildCandidate({
        company: buildCompany({ id: "caro" }),
        mensalidadesAtivasCentavos: [50_000],
      });
      const barato = buildCandidate({
        company: buildCompany({ id: "barato" }),
        mensalidadesAtivasCentavos: [10_000],
      });
      transporterRepository.searchCandidates.mockResolvedValue([semPreco, caro, barato]);

      const result = await service.search(buildQuery({ mensalidadeMaxCentavos: 20_000 }));

      expect(result.items.map((i) => i.id).sort()).toEqual(["barato", "sem-preco"].sort());
    });

    it("filtra apenasVerificados usando o selo Verificado real", async () => {
      const naoVerificado = buildCandidate({ company: buildCompany({ id: "nao-verificado" }) });
      transporterRepository.searchCandidates.mockResolvedValue([naoVerificado]);

      const result = await service.search(buildQuery({ apenasVerificados: true }));

      expect(result.items).toHaveLength(0);
    });

    it("ordena por avaliação desc quando sortBy=avaliacao", async () => {
      const baixa = buildCandidate({
        company: buildCompany({ id: "baixa" }),
        ratings: [{ nota: 2 }],
      });
      const alta = buildCandidate({
        company: buildCompany({ id: "alta" }),
        ratings: [{ nota: 5 }],
      });
      transporterRepository.searchCandidates.mockResolvedValue([baixa, alta]);

      const result = await service.search(buildQuery({ sortBy: "avaliacao" }));

      expect(result.items.map((i) => i.id)).toEqual(["alta", "baixa"]);
    });

    it("pagina os resultados já filtrados/ordenados", async () => {
      const candidates = Array.from({ length: 5 }, (_, i) =>
        buildCandidate({ company: buildCompany({ id: `company-${i}` }) }),
      );
      transporterRepository.searchCandidates.mockResolvedValue(candidates);

      const result = await service.search(buildQuery({ page: 2, pageSize: 2 }));

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
    });
  });

  describe("findByIdOrThrow", () => {
    it("lança NotFoundException quando o transportador não existe/não está ativo", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(null);

      await expect(service.findByIdOrThrow("company-x")).rejects.toThrow(NotFoundException);
    });

    it("retorna o detalhe com avaliações recentes", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(buildCandidate());
      transporterRepository.listRecentRatingsForCompany.mockResolvedValue([
        {
          id: "rating-1",
          contractId: "contract-1",
          responsavelId: "responsavel-1",
          companyId: "company-1",
          alvoTipo: "EMPRESA",
          alvoId: "company-1",
          nota: 5,
          comentario: "Excelente!",
          createdAt: new Date(),
          responsavel: { nome: "Maria" },
        },
      ]);

      const result = await service.findByIdOrThrow("company-1", -23.561684, -46.655981);

      expect(result.razaoSocial).toBe("Transporte Escolar LTDA");
      expect(result.avaliacoesRecentes).toHaveLength(1);
      expect(result.avaliacoesRecentes[0].responsavelNome).toBe("Maria");
      expect(result.distanciaKm).toBeCloseTo(0, 1);
    });

    it("usa distância 0 quando o chamador não informa coordenadas", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(buildCandidate());
      transporterRepository.listRecentRatingsForCompany.mockResolvedValue([]);

      const result = await service.findByIdOrThrow("company-1");

      expect(result.distanciaKm).toBe(0);
    });

    it("retorna escolas atendidas, equipe e tempo médio de resposta reais (perfil público)", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(buildCandidate());
      transporterRepository.listRecentRatingsForCompany.mockResolvedValue([]);
      transporterRepository.listActiveSchoolsForCompany.mockResolvedValue([
        { id: "school-1", nomeOficial: "Escola Modelo" },
      ]);
      transporterRepository.listPublicTeamForCompany.mockResolvedValue([
        { nome: "João Motorista", papel: "motorista" },
        { nome: "Ana Monitora", papel: "monitor" },
      ]);
      transporterRepository.computeAverageResponseHours.mockResolvedValue(4.5);

      const result = await service.findByIdOrThrow("company-1");

      expect(result.atuandoDesde).toBeInstanceOf(Date);
      expect(result.escolasAtendidas).toEqual([{ id: "school-1", nomeOficial: "Escola Modelo" }]);
      expect(result.equipe).toEqual([
        { nome: "João Motorista", papel: "motorista" },
        { nome: "Ana Monitora", papel: "monitor" },
      ]);
      expect(result.tempoMedioRespostaHoras).toBe(4.5);
    });

    it("retorna tempoMedioRespostaHoras null quando a empresa nunca decidiu nenhuma solicitação", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(buildCandidate());
      transporterRepository.listRecentRatingsForCompany.mockResolvedValue([]);
      transporterRepository.computeAverageResponseHours.mockResolvedValue(null);

      const result = await service.findByIdOrThrow("company-1");

      expect(result.tempoMedioRespostaHoras).toBeNull();
    });
  });

  describe("findByCodeOrThrow (Frente M)", () => {
    it("lança NotFoundException quando nenhuma transportadora tem esse código", async () => {
      transporterRepository.findCandidateByCodigoInterno.mockResolvedValue(null);

      await expect(service.findByCodeOrThrow("TRN-999999")).rejects.toThrow(NotFoundException);
    });

    it("normaliza espaços e caixa (minúsculo) antes de consultar", async () => {
      transporterRepository.findCandidateByCodigoInterno.mockResolvedValue(buildCandidate());
      transporterRepository.listRecentRatingsForCompany.mockResolvedValue([]);

      await service.findByCodeOrThrow("  trn-000001  ");

      expect(transporterRepository.findCandidateByCodigoInterno).toHaveBeenCalledWith("TRN-000001");
    });

    it("retorna o mesmo perfil público de findByIdOrThrow, sem coordenadas (distância 0)", async () => {
      transporterRepository.findCandidateByCodigoInterno.mockResolvedValue(buildCandidate());
      transporterRepository.listRecentRatingsForCompany.mockResolvedValue([]);

      const result = await service.findByCodeOrThrow("TRN-000001");

      expect(result.razaoSocial).toBe("Transporte Escolar LTDA");
      expect(result.distanciaKm).toBe(0);
    });
  });
});
