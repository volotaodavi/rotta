import { TrackersService } from "../trackers.service";

import type { TraccarForwardDto } from "../dto/traccar-forward.dto";
import type { RouteAssignmentRepository } from "@/modules/route-assignments/repositories/route-assignment.repository";
import type { RouteRepository } from "@/modules/routes/repositories/route.repository";
import type { TripPositionRepository } from "@/modules/trips/repositories/trip-position.repository";
import type { TripRepository } from "@/modules/trips/repositories/trip.repository";
import type { TripsService } from "@/modules/trips/trips.service";
import type { VehicleRepository } from "@/modules/vehicles/repositories/vehicle.repository";
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
    candidatas?: {
      id: string;
      nome: string;
      turno: string;
      paradas: { latitude: number; longitude: number; horarioPrevisto: string }[];
    }[];
    semSinal?: {
      id: string;
      companyId: string;
      motoristaId: string;
      ultimoSinalEm: Date;
    }[];
  } = {},
) {
  const findByRastreadorImei = jest
    .fn()
    .mockResolvedValue(opcoes.veiculo === undefined ? veiculo : opcoes.veiculo);
  const findAtivaPorVeiculoPadrao = jest
    .fn()
    .mockResolvedValue(opcoes.rota === undefined ? rota : opcoes.rota);
  // O repositório já devolve só as escalas de rota viável (`ATIVA`,
  // não excluída) — esse filtro é condição da consulta desde a
  // auditoria de 26/09/2026 (item 5), e é guardado no `where` do
  // `PrismaRouteAssignmentRepository`.
  const listDoDiaPorVeiculo = jest.fn().mockResolvedValue(opcoes.escalas ?? []);
  const listRouteIdsComViagemEncerrada = jest
    .fn()
    .mockResolvedValue((opcoes.viagensEncerradas ?? []).map((v) => v.routeId));

  const vehicleRepository = { findByRastreadorImei } as unknown as VehicleRepository;
  /* As rotas com paradas, para a sugestao por trajeto quando o onibus
     liga a ignicao sem escala. Vazio por padrao: a maioria dos testes
     nao e sobre isso. */
  const listCandidatasParaSugestaoAcrossTenants = jest
    .fn()
    .mockResolvedValue(opcoes.candidatas ?? []);
  const routeRepository = {
    findAtivaPorVeiculoPadrao,
    listCandidatasParaSugestaoAcrossTenants,
  } as unknown as RouteRepository;
  const escalaRepository = { listDoDiaPorVeiculo } as unknown as RouteAssignmentRepository;
  const listSemSinalAcrossTenants = jest.fn().mockResolvedValue(opcoes.semSinal ?? []);
  const tripRepository = {
    listRouteIdsComViagemEncerrada,
    listSemSinalAcrossTenants,
  } as unknown as TripRepository;

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
      vehiclesService,
      tripsService,
      positionRepository,
      vehicleRepository,
      routeRepository,
      escalaRepository,
      tripRepository,
      configService,
    ),
    vehiclesService,
    tripsService,
    positionRepository,
    routeRepository,
    tripRepository,
    findAtivaPorVeiculoPadrao,
    listDoDiaPorVeiculo,
    listRouteIdsComViagemEncerrada,
  };
}

/** Uma escala do dia, como o repositório a devolve. */
function escala(routeId: string, motoristaId: string) {
  return { routeId, motoristaId, monitorId: null };
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

  /*
    O caso mais comum do transporte escolar municipal, e nao e excecao:
    o despachante remaneja de manha, o carro que era da linha do Ubatiba
    vai para a do Silvado porque outro quebrou, e a escala nao foi
    registrada. Ate 26/10/2026 isso virava um aviso generico que ninguem
    lia e o onibus rodava o dia inteiro sem viagem aberta.

    Rastreador NAO le letreiro: nao existe sensor para isso. Mas o
    letreiro mente (quem o escreve esquece de trocar) e o trajeto nao.
  */
  it("sem escala, o trajeto diz qual rota parece ser, com nome e confianca", async () => {
    const aviso = jest.fn();
    const { service } = criarServico({
      rota: null,
      candidatas: [
        {
          id: "rota-silvado",
          nome: "Linha do Silvado",
          turno: "MANHA",
          paradas: [
            { latitude: -22.9194, longitude: -42.8186, horarioPrevisto: "08:00" },
            { latitude: -22.9196, longitude: -42.8188, horarioPrevisto: "08:05" },
          ],
        },
      ],
    });
    jest.spyOn(service["logger"], "warn").mockImplementation(aviso);

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("Linha do Silvado"));
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("Despachante"));
  });

  /* A sugestao e um extra. Se a consulta de rotas falhar, o aviso de
     que o onibus ligou sem escala continua saindo, que e o que importa. */
  it("falha ao sugerir nao engole o aviso de que o onibus ligou sem escala", async () => {
    const aviso = jest.fn();
    const { service, routeRepository } = criarServico({ rota: null });
    (routeRepository.listCandidatasParaSugestaoAcrossTenants as jest.Mock).mockRejectedValue(
      new Error("banco fora"),
    );
    jest.spyOn(service["logger"], "warn").mockImplementation(aviso);

    const resultado = await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(resultado.aceita).toBe(true);
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("sem escala de hoje"));
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
    const { service, tripsService, findAtivaPorVeiculoPadrao } = criarServico({
      escalas: [escala("rota-hoje", "motorista-escalado")],
    });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: "rota-hoje" }),
      expect.objectContaining({ sub: "motorista-escalado" }),
      {},
    );
    // Nem chega a consultar o padrão da rota quando há escala.
    expect(findAtivaPorVeiculoPadrao).not.toHaveBeenCalled();
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

  it("escala de rota pausada não chega até aqui — e o padrão assume", async () => {
    // Rota pausada não roda, e o repositório já não a devolve (o
    // `where` de `listDoDiaPorVeiculo` exige `status: ATIVA`). Do
    // ponto de vista do serviço é o mesmo que não haver escala: cai no
    // padrão, que é o comportamento certo — e se não houver padrão,
    // nada abre, que é melhor que abrir errado.
    const { service, tripsService } = criarServico({ escalas: [] });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(tripsService.start).toHaveBeenCalledWith(
      expect.objectContaining({ routeId: "rota-1" }),
      expect.anything(),
      {},
    );
  });

  it("pergunta a escala pelo ônibus e pelo dia, nunca só pela empresa", async () => {
    // O `companyId` vem do próprio ônibus já resolvido pelo IMEI — é
    // ele que mantém restrito o bypass de RLS que a consulta faz (não
    // há ator: quem fala é um aparelho).
    const { service, listDoDiaPorVeiculo } = criarServico({ escalas: [] });

    await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

    expect(listDoDiaPorVeiculo).toHaveBeenCalledWith("company-1", "veiculo-1", expect.any(Date));
  });

  it("ignicao as 21h30 de Brasilia abre a escala de HOJE, nao a de amanha", async () => {
    /*
      O defeito, conferido em producao e corrigido em 28/10/2026: o
      servidor roda em UTC e o Brasil esta tres horas atras. As 21h30 de
      Brasilia ja e 00h30 do dia seguinte em UTC, entao "hoje" calculado
      em UTC apontava para AMANHA. O onibus do turno da noite procurava
      a escala do dia errado, nao achava nada, e a viagem nao abria.
      Para a familia, aquele onibus simplesmente nao existia.

      Tres horas por noite, todos os dias, no turno em que mais importa
      alguem estar vendo.
    */
    jest.useFakeTimers().setSystemTime(new Date("2026-10-29T00:30:00.000Z")); // 21h30 em Brasilia, dia 28
    try {
      const { service, listDoDiaPorVeiculo } = criarServico({ escalas: [] });

      await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

      const diaConsultado = listDoDiaPorVeiculo.mock.calls[0]?.[2] as Date;
      expect(diaConsultado.toISOString()).toBe("2026-10-28T00:00:00.000Z");
    } finally {
      jest.useRealTimers();
    }
  });

  it("a mesma conta vale para a viagem ja encerrada", async () => {
    // Sem isto, a escala da noite seria lida de um dia e as viagens
    // encerradas de outro: o onibus reabriria uma viagem que ja tinha
    // terminado, ou nunca abriria a que faltava.
    jest.useFakeTimers().setSystemTime(new Date("2026-10-29T00:30:00.000Z"));
    try {
      const { service, listRouteIdsComViagemEncerrada } = criarServico({
        escalas: [{ routeId: "rota-1", motoristaId: "motorista-1", monitorId: null }],
      });

      await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

      const diaConsultado = listRouteIdsComViagemEncerrada.mock.calls[0]?.[1] as Date;
      expect(diaConsultado.toISOString()).toBe("2026-10-28T00:00:00.000Z");
    } finally {
      jest.useRealTimers();
    }
  });

  it("de dia os dois jeitos de contar coincidem, e nada muda", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-28T11:00:00.000Z")); // 8h em Brasilia
    try {
      const { service, listDoDiaPorVeiculo } = criarServico({ escalas: [] });

      await service.registrarPosicao(posicao({ attributes: { ignition: true } }));

      const diaConsultado = listDoDiaPorVeiculo.mock.calls[0]?.[2] as Date;
      expect(diaConsultado.toISOString()).toBe("2026-10-28T00:00:00.000Z");
    } finally {
      jest.useRealTimers();
    }
  });
});

/*
  A rede de seguranca que estava prometida e nao existia.

  `TrackersConfig.minutosSemSinalParaEncerrar` estava configurado e
  documentado desde 24/09/2026, com a explicacao do que acontece sem
  ele, e NADA o lia. A auditoria de 26/10/2026 achou. A propria
  documentacao da constante diz: "sem esta rede de seguranca, a viagem
  ficaria EM_ANDAMENTO para sempre e o pai veria o onibus parado no
  mesmo ponto a noite inteira".

  Perder sinal ao entrar na garagem coberta nao e excecao, e rotina.
*/
describe("encerrarViagensSemSinal", () => {
  const agora = new Date("2026-10-26T18:00:00.000Z");

  it("encerra a viagem que parou de receber posicao", async () => {
    const { service, tripsService } = criarServico({
      semSinal: [
        {
          id: "trip-muda",
          companyId: "company-1",
          motoristaId: "motorista-1",
          ultimoSinalEm: new Date("2026-10-26T17:00:00.000Z"),
        },
      ],
    });

    const resultado = await service.encerrarViagensSemSinal(agora);

    expect(tripsService.finish).toHaveBeenCalledWith("trip-muda", expect.anything(), {});
    expect(resultado).toEqual({ avaliadas: 1, encerradas: 1, falhas: 0 });
  });

  /* O corte vem de `TRACKER_TIMEOUT_MINUTOS`, e nao de um numero solto
     aqui dentro: quem muda a configuracao muda o comportamento. */
  it("o limite vem da configuracao, nao do codigo", async () => {
    const { service, tripRepository } = criarServico();

    await service.encerrarViagensSemSinal(agora);

    expect(tripRepository.listSemSinalAcrossTenants).toHaveBeenCalledWith(
      new Date("2026-10-26T17:40:00.000Z"),
      expect.any(Number),
    );
  });

  /* Sao empresas diferentes: uma viagem que falha nao pode impedir as
     outras, e o que falhar volta na proxima rodada. */
  it("uma viagem que falha nao impede as outras", async () => {
    const { service, tripsService } = criarServico({
      semSinal: [
        {
          id: "trip-ruim",
          companyId: "company-1",
          motoristaId: "motorista-1",
          ultimoSinalEm: new Date("2026-10-26T17:00:00.000Z"),
        },
        {
          id: "trip-boa",
          companyId: "company-2",
          motoristaId: "motorista-2",
          ultimoSinalEm: new Date("2026-10-26T17:00:00.000Z"),
        },
      ],
    });
    (tripsService.finish as jest.Mock)
      .mockRejectedValueOnce(new Error("banco fora"))
      .mockResolvedValueOnce({ id: "trip-boa" });

    const resultado = await service.encerrarViagensSemSinal(agora);

    expect(resultado).toEqual({ avaliadas: 2, encerradas: 1, falhas: 1 });
    expect(tripsService.finish).toHaveBeenCalledWith("trip-boa", expect.anything(), {});
  });

  it("sem viagem muda, nao mexe em nada", async () => {
    const { service, tripsService } = criarServico();

    const resultado = await service.encerrarViagensSemSinal(agora);

    expect(tripsService.finish).not.toHaveBeenCalled();
    expect(resultado).toEqual({ avaliadas: 0, encerradas: 0, falhas: 0 });
  });
});
