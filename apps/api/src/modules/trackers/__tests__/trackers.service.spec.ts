import { TrackersService } from "../trackers.service";

import type { TraccarForwardDto } from "../dto/traccar-forward.dto";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { TripPositionRepository } from "@/modules/trips/repositories/trip-position.repository";
import type { TripsService } from "@/modules/trips/trips.service";
import type { VehiclesService } from "@/modules/vehicles/vehicles.service";
import type { ConfigService } from "@nestjs/config";

/**
 * Ingestão de rastreador físico (24/09/2026).
 *
 * O que estes testes protegem, em ordem de gravidade:
 *
 * 1. **Nunca falhar barulhento.** O Traccar reentrega o que falha, para
 *    sempre. Se um IMEI desconhecido virasse exceção, a fila entupiria
 *    e as posições dos ônibus CERTOS parariam de chegar.
 * 2. **Nunca desenhar o ônibus onde ele não está.** Posição sem fix,
 *    velocidade em unidade errada e instante errado são as três formas
 *    de mentir para uma família olhando o mapa.
 * 3. **A ignição comanda a viagem.** É ela que substitui o motorista
 *    apertando "iniciar" no app.
 */

const IMEI = "863719060123456";

const veiculo = {
  id: "veiculo-1",
  companyId: "company-1",
  numeroFrota: "412",
  placa: "ABC1D23",
  viagemAtualId: null as string | null,
  rastreadorImei: IMEI,
  deletedAt: null,
};

const rota = {
  id: "rota-1",
  companyId: "company-1",
  nome: "Rota Centro",
  veiculoPadraoId: "veiculo-1",
  motoristaPadraoId: "motorista-1",
  status: "ATIVA",
};

function posicao(overrides: Partial<TraccarForwardDto> = {}): TraccarForwardDto {
  return {
    device: { uniqueId: IMEI },
    latitude: -22.9194,
    longitude: -42.8186,
    speed: 10,
    fixTime: "2026-09-24T11:00:00.000Z",
    serverTime: "2026-09-24T13:00:00.000Z",
    valid: true,
    attributes: {},
    ...overrides,
  };
}

function criarServico(
  opcoes: {
    veiculo?: typeof veiculo | null;
    rota?: typeof rota | null;
    escalas?: unknown[];
    viagensEncerradas?: { routeId: string }[];
  } = {},
) {
  const vehicleFindFirst = jest
    .fn()
    .mockResolvedValue(opcoes.veiculo === undefined ? veiculo : opcoes.veiculo);
  const routeFindFirst = jest
    .fn()
    .mockResolvedValue(opcoes.rota === undefined ? rota : opcoes.rota);
  const escalaFindMany = jest.fn().mockResolvedValue(opcoes.escalas ?? []);
  const tripFindMany = jest.fn().mockResolvedValue(opcoes.viagensEncerradas ?? []);

  const prisma = {
    withBypass: jest.fn((op: unknown) => op),
    vehicle: { findFirst: vehicleFindFirst },
    route: { findFirst: routeFindFirst },
    routeAssignment: { findMany: escalaFindMany },
    trip: { findMany: tripFindMany },
  } as unknown as PrismaService;

  const vehiclesService = {
    registrarPosicaoDeRastreador: jest.fn().mockResolvedValue(undefined),
    updateLocationFromTrip: jest.fn().mockResolvedValue(undefined),
  } as unknown as VehiclesService;

  const tripsService = {
    start: jest.fn().mockResolvedValue({ id: "trip-1" }),
    finish: jest.fn().mockResolvedValue({ id: "trip-1" }),
  } as unknown as TripsService;

  const positionRepository = {
    create: jest.fn().mockResolvedValue({}),
  } as unknown as TripPositionRepository;

  const configService = {
    get: jest.fn().mockReturnValue({ ingestSecret: "s3gr3d0", minutosSemSinalParaEncerrar: 20 }),
  } as unknown as ConfigService;

  return {
    service: new TrackersService(
      prisma,
      vehiclesService,
      tripsService,
      positionRepository,
      configService,
    ),
    vehiclesService,
    tripsService,
    positionRepository,
    routeFindFirst,
    escalaFindMany,
  };
}

/** Uma escala do dia, como o Prisma devolve com `include: { route }`. */
function escala(routeId: string, motoristaId: string, ativa = true) {
  return {
    routeId,
    motoristaId,
    monitorId: null,
    route: { id: routeId, status: ativa ? "ATIVA" : "PAUSADA", deletedAt: null },
  };
}

describe("nunca falhar barulhento — o Traccar reentrega o que falha", () => {
  it("IMEI não credenciado é descartado, não lança", async () => {
    // Acontece de verdade: aparelho instalado antes de alguém
    // credenciar o IMEI no painel.
    const { service, positionRepository } = criarServico({ veiculo: null });

    const resultado = await service.registrarPosicao(posicao());

    expect(resultado.aceita).toBe(false);
    expect(resultado.motivo).toContain("não credenciado");
    expect(positionRepository.create).not.toHaveBeenCalled();
  });

  it("falha ao abrir viagem não derruba a requisição", async () => {
    // Conflito comum: a viagem já foi aberta pelo app, ou duas posições
    // chegaram juntas na virada da ignição.
    const { service, tripsService } = criarServico();
    (tripsService.start as jest.Mock).mockRejectedValue(
      new Error("Já existe viagem em andamento."),
    );

    const resultado = await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(resultado.aceita).toBe(true);
  });
});

describe("nunca desenhar o ônibus onde ele não está", () => {
  it("descarta posição sem fix válido de GPS", async () => {
    // Aparelho ligado e falando, mas sem saber onde está (garagem
    // coberta, túnel). Gravar poria o ônibus no meio do oceano.
    const { service, vehiclesService } = criarServico();

    const resultado = await service.registrarPosicao(posicao({ valid: false }));

    expect(resultado.aceita).toBe(false);
    expect(vehiclesService.registrarPosicaoDeRastreador).not.toHaveBeenCalled();
  });

  it("converte velocidade de NÓS para km/h", async () => {
    // O Traccar encaminha em nós. Sem converter, um ônibus a 37 km/h
    // apareceria como 20.
    const { service, positionRepository } = criarServico({
      veiculo: { ...veiculo, viagemAtualId: "trip-1" },
    });

    await service.registrarPosicao(posicao({ speed: 10 }));

    const gravado = (positionRepository.create as jest.Mock).mock.calls[0][0];
    expect(gravado.velocidadeKmh).toBeCloseTo(18.52, 2);
  });

  it("usa fixTime, não serverTime — o instante em que o ônibus ESTEVE ali", async () => {
    // Num aparelho que guardou posições offline e despejou tudo ao
    // recuperar sinal, os dois diferem em horas: `serverTime`
    // desenharia o trajeto inteiro no instante da reconexão.
    const { service, positionRepository } = criarServico({
      veiculo: { ...veiculo, viagemAtualId: "trip-1" },
    });

    await service.registrarPosicao(posicao());

    const gravado = (positionRepository.create as jest.Mock).mock.calls[0][0];
    expect(gravado.capturadaEm.toISOString()).toBe("2026-09-24T11:00:00.000Z");
  });
});

describe("a ignição comanda a viagem", () => {
  it("ignição ligada sem viagem aberta INICIA a viagem da rota do ônibus", async () => {
    const { service, tripsService } = criarServico();

    const resultado = await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      { routeId: "rota-1", veiculoId: "veiculo-1" },
      // Ator sintético: o motorista designado é quem virou a chave, e
      // a autoridade exercida é a da transportadora.
      expect.objectContaining({ sub: "motorista-1", tenantId: "company-1" }),
      {},
    );
    expect(resultado.tripId).toBe("trip-1");
  });

  it("ignição ligada sem rota designada não abre viagem, mas aceita a posição", async () => {
    const { service, tripsService, vehiclesService } = criarServico({ rota: null });

    const resultado = await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).not.toHaveBeenCalled();
    expect(resultado.aceita).toBe(true);
    // A posição do veículo ainda vale: o mapa da frota mostra o ônibus
    // manobrando na garagem mesmo fora de rota.
    expect(vehiclesService.registrarPosicaoDeRastreador).toHaveBeenCalled();
  });

  it("ignição desligada com viagem aberta ENCERRA a viagem", async () => {
    const { service, tripsService } = criarServico({
      veiculo: { ...veiculo, viagemAtualId: "trip-1" },
    });

    await service.registrarPosicao(posicao({ attributes: { ignition: false } }));

    expect(tripsService.finish).toHaveBeenCalledWith("trip-1", expect.anything(), {});
  });

  it("aparelho que não reporta ignição nunca é tratado como desligado", async () => {
    // `ignition: undefined` é "não sei", não "desligado". Tratar como
    // desligado encerraria a viagem de todo ônibus cujo aparelho não
    // tem o fio ACC ligado.
    const { service, tripsService } = criarServico({
      veiculo: { ...veiculo, viagemAtualId: "trip-1" },
    });

    await service.registrarPosicao(posicao({ attributes: {} }));

    expect(tripsService.finish).not.toHaveBeenCalled();
    expect(tripsService.start).not.toHaveBeenCalled();
  });
});

describe("onde a posição é gravada", () => {
  it("com viagem aberta, grava na viagem — a mesma tabela que o app do responsável lê", async () => {
    const { service, positionRepository, vehiclesService } = criarServico({
      veiculo: { ...veiculo, viagemAtualId: "trip-1" },
    });

    await service.registrarPosicao(posicao());

    expect(positionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tripId: "trip-1", companyId: "company-1" }),
    );
    expect(vehiclesService.updateLocationFromTrip).toHaveBeenCalled();
  });

  it("sem viagem aberta, atualiza só o veículo — nunca cria posição órfã", async () => {
    const { service, positionRepository, vehiclesService } = criarServico();

    await service.registrarPosicao(posicao());

    expect(positionRepository.create).not.toHaveBeenCalled();
    expect(vehiclesService.registrarPosicaoDeRastreador).toHaveBeenCalledWith("veiculo-1", {
      latitude: -22.9194,
      longitude: -42.8186,
      capturadaEm: new Date("2026-09-24T11:00:00.000Z"),
    });
  });
});

/**
 * Escala do dia mandando na viagem (24/09/2026).
 *
 * A precedência é a regra central do fluxo do despachante: escala do
 * dia vence o padrão da rota. Se isso inverter, o rodízio deixa de
 * funcionar em silêncio — o ônibus emprestado abriria a rota de sempre,
 * com o motorista de sempre, e ninguém veria o erro até uma família
 * cobrar.
 */
describe("escala do dia manda na viagem", () => {
  it("escala do dia VENCE o veículo/motorista padrão da rota", async () => {
    const { service, tripsService, routeFindFirst } = criarServico({
      escalas: [escala("rota-hoje", "motorista-escalado")],
    });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: "rota-hoje" }),
      expect.objectContaining({ sub: "motorista-escalado" }),
      {},
    );
    // Nem chega a consultar o padrão da rota quando há escala.
    expect(routeFindFirst).not.toHaveBeenCalled();
  });

  it("sem escala, cai no padrão da rota — o caso 'ônibus fixo' segue intacto", async () => {
    const { service, tripsService } = criarServico({ escalas: [] });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: "rota-1" }),
      expect.objectContaining({ sub: "motorista-1" }),
      {},
    );
  });

  it("duas escalas no dia: abre a da manhã primeiro", async () => {
    // O mesmo ônibus faz manhã e tarde. A chave virada às 6h abre a
    // primeira; ninguém escolhe nada.
    const { service, tripsService } = criarServico({
      escalas: [escala("rota-manha", "motorista-a"), escala("rota-tarde", "motorista-b")],
      viagensEncerradas: [],
    });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: "rota-manha" }),
      expect.anything(),
      {},
    );
  });

  it("com a da manhã já encerrada, a chave do meio-dia abre a da tarde", async () => {
    const { service, tripsService } = criarServico({
      escalas: [escala("rota-manha", "motorista-a"), escala("rota-tarde", "motorista-b")],
      viagensEncerradas: [{ routeId: "rota-manha" }],
    });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: "rota-tarde" }),
      expect.objectContaining({ sub: "motorista-b" }),
      {},
    );
  });

  it("todas as escalas do dia já rodaram: manobrar na garagem não reabre viagem", async () => {
    const { service, tripsService } = criarServico({
      escalas: [escala("rota-manha", "motorista-a")],
      viagensEncerradas: [{ routeId: "rota-manha" }],
    });

    const resultado = await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).not.toHaveBeenCalled();
    expect(resultado.aceita).toBe(true);
  });

  it("escala apontando para rota pausada é ignorada", async () => {
    // Rota pausada não roda. Cair no padrão é o comportamento certo —
    // e se não houver padrão, nada abre, que é melhor que abrir errado.
    const { service, tripsService } = criarServico({
      escalas: [escala("rota-pausada", "motorista-x", false)],
    });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: "rota-1" }),
      expect.anything(),
      {},
    );
  });
});
