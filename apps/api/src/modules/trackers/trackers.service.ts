import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CONFIANCA_PARA_SUGERIR, sugerirRotaPeloTrajeto } from "./sugerir-rota.util";

import type { TraccarForwardDto } from "./dto/traccar-forward.dto";
import type { PosicaoObservada } from "./sugerir-rota.util";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { TrackersConfig } from "@/config/trackers.config";
import type { RouteAssignmentRepository } from "@/modules/route-assignments/repositories/route-assignment.repository";
import type { RouteRepository } from "@/modules/routes/repositories/route.repository";
import type { TripPositionRepository } from "@/modules/trips/repositories/trip-position.repository";
import type { TripRepository } from "@/modules/trips/repositories/trip.repository";
import type { VehicleRepository } from "@/modules/vehicles/repositories/vehicle.repository";
import type { Vehicle } from "@prisma/client";

import { ROUTE_ASSIGNMENT_REPOSITORY } from "@/modules/route-assignments/route-assignments.constants";
import { ROUTE_REPOSITORY } from "@/modules/routes/routes.constants";
import { TRIP_POSITION_REPOSITORY, TRIP_REPOSITORY } from "@/modules/trips/trips.constants";
import { TripsService } from "@/modules/trips/trips.service";
import { VEHICLE_REPOSITORY } from "@/modules/vehicles/vehicles.constants";
import { VehiclesService } from "@/modules/vehicles/vehicles.service";
import { Role } from "@/shared/enums";
import { inicioDoDiaNaOperacao } from "@/shared/utils/dia.util";

/** Um nó é 1,852 km/h — o Traccar encaminha velocidade em nós, sem converter. */
const KMH_POR_NO = 1.852;

/**
 * Quantas viagens sem sinal a varredura encerra por rodada.
 *
 * Teto, e não meta: a lista normal é de zero a algumas unidades. Um
 * número alto aqui só importaria no dia em que algo sistêmico (a
 * provedora de dados fora do ar, por exemplo) deixasse a frota inteira
 * muda ao mesmo tempo, e nesse dia encerrar tudo numa rodada só é pior
 * do que drenar aos poucos.
 */
const LIMITE_POR_VARREDURA = 200;

/**
 * O que aconteceu com uma posição recebida. Devolvido ao receptor só
 * para diagnóstico: o Traccar ignora o corpo da resposta, mas quem
 * estiver depurando uma instalação precisa ver por que a posição não
 * virou nada.
 */
/** Rota + pessoas que este ônibus faz hoje — da escala ou do padrão. */
interface DesignacaoDoDia {
  routeId: string;
  motoristaId: string;
  monitorId: string | null;
}

export interface ResultadoDaPosicao {
  aceita: boolean;
  motivo: string;
  vehicleId?: string;
  tripId?: string;
}

/**
 * Ingestão de posições de rastreador físico (pedido do usuário
 * 24/09/2026: "quero algo realmente funcionando, algo transmissível").
 *
 * ## A cadeia inteira
 *
 * ```
 * Rastreador --TCP/Teltonika--> Traccar --HTTPS/JSON--> ESTE serviço
 *   -> acha o ônibus pelo IMEI
 *   -> ignição ligou? abre a viagem do dia
 *   -> grava a posição onde o app do responsável JÁ lê
 *   -> ignição desligou? encerra a viagem
 * ```
 *
 * ## Por que o Traccar no meio, e não um decodificador nosso
 *
 * O rastreador fala binário sobre TCP cru. Escrever o decodificador do
 * Teltonika (Codec 8/8E/16) e do GT06 à mão significaria acertar
 * variantes de protocolo, ACKs e keepalives no escuro — e descobrir os
 * erros no dia da instalação, com 100 ônibus na rua. O Traccar já faz
 * isso há anos, é gratuito, e encaminha o resultado em JSON. O que é
 * NOSSO é o que está aqui: traduzir posição em operação.
 *
 * ## A regra que atravessa o arquivo: nunca falhar barulhento
 *
 * Toda resposta é 200, mesmo quando a posição é descartada. O Traccar
 * reentrega o que falha, para sempre. Um IMEI desconhecido respondido
 * com 404 viraria uma fila infinita de retentativas que nunca vão dar
 * certo — e que atrasaria as posições dos ônibus que ESTÃO certos.
 * Descartar é registrado no log e segue a vida.
 */
@Injectable()
export class TrackersService {
  private readonly logger = new Logger(TrackersService.name);
  private readonly config: TrackersConfig;

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly tripsService: TripsService,
    @Inject(TRIP_POSITION_REPOSITORY)
    private readonly positionRepository: TripPositionRepository,
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
    @Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository,
    @Inject(ROUTE_ASSIGNMENT_REPOSITORY)
    private readonly escalas: RouteAssignmentRepository,
    @Inject(TRIP_REPOSITORY) private readonly trips: TripRepository,
    configService: ConfigService,
  ) {
    this.config = configService.get<TrackersConfig>("trackers")!;
  }

  async registrarPosicao(payload: TraccarForwardDto): Promise<ResultadoDaPosicao> {
    const imei = payload.device.uniqueId.trim();

    // Posição sem fix de satélite: o aparelho está ligado e falando,
    // mas não sabe onde está (garagem coberta, túnel). Gravar isso
    // colocaria o ônibus no meio do oceano ou na última posição boa
    // repetida — as duas mentiras.
    if (payload.valid === false) {
      return { aceita: false, motivo: "Posição sem fix válido de GPS." };
    }

    const veiculo = await this.acharVeiculoPorImei(imei);
    if (!veiculo) {
      // Acontece de verdade: aparelho instalado no ônibus antes de
      // alguém credenciar o IMEI no painel. Log em `warn` porque é
      // acionável — é o Admin que tem de abrir a tela e credenciar.
      this.logger.warn(`Posição de IMEI não credenciado: ${imei}`);
      return { aceita: false, motivo: "IMEI não credenciado em nenhum ônibus." };
    }

    const capturadaEm = this.instanteDaPosicao(payload);
    const ignicao = payload.attributes?.ignition;

    // A posição do VEÍCULO é atualizada sempre, mesmo sem viagem. É o
    // que faz o mapa da frota (Empresa/Gestor) funcionar com o ônibus
    // manobrando na garagem, fora de rota.
    await this.vehiclesService.registrarPosicaoDeRastreador(veiculo.id, {
      latitude: payload.latitude,
      longitude: payload.longitude,
      capturadaEm,
    });

    // Ignição ligou e não há viagem aberta → o dia começou.
    if (ignicao === true && !veiculo.viagemAtualId) {
      const tripId = await this.abrirViagemDoDia(veiculo, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        capturadaEm,
      });
      if (tripId) {
        await this.gravarNaViagem(tripId, veiculo, payload, capturadaEm);
        return {
          aceita: true,
          motivo: "Viagem aberta pela ignição.",
          vehicleId: veiculo.id,
          tripId,
        };
      }
      return {
        aceita: true,
        motivo: "Ignição ligada, mas o ônibus não está designado a nenhuma rota hoje.",
        vehicleId: veiculo.id,
      };
    }

    // Ignição desligou e havia viagem aberta → o dia acabou para este
    // ônibus. Encerra ANTES de tentar gravar a posição: gravar depois
    // de encerrar deixaria um ponto órfão depois do fim da viagem.
    if (ignicao === false && veiculo.viagemAtualId) {
      await this.encerrarViagem(veiculo, veiculo.viagemAtualId);
      return {
        aceita: true,
        motivo: "Viagem encerrada pela ignição.",
        vehicleId: veiculo.id,
        tripId: veiculo.viagemAtualId,
      };
    }

    if (!veiculo.viagemAtualId) {
      return {
        aceita: true,
        motivo: "Ônibus sem viagem aberta: posição registrada só na frota.",
        vehicleId: veiculo.id,
      };
    }

    await this.gravarNaViagem(veiculo.viagemAtualId, veiculo, payload, capturadaEm);
    return {
      aceita: true,
      motivo: "Posição registrada na viagem.",
      vehicleId: veiculo.id,
      tripId: veiculo.viagemAtualId,
    };
  }

  /**
   * Encerra as viagens que pararam de receber posição.
   *
   * ## Por que existe, e por que era um defeito não existir
   *
   * `TrackersConfig.minutosSemSinalParaEncerrar` está configurado e
   * documentado desde 24/09/2026, com a explicação do que acontece sem
   * ele, e **nada o lia**. A auditoria de 26/10/2026 achou isso. O que
   * a própria documentação da constante promete:
   *
   * > "sem esta rede de segurança, a viagem ficaria EM_ANDAMENTO para
   * > sempre e o pai veria o ônibus parado no mesmo ponto a noite
   * > inteira."
   *
   * Nem todo desligamento chega: o aparelho perde sinal ao entrar na
   * garagem coberta, ou o pacote de ignição desligada simplesmente se
   * perde. Com rastreador em frota, isso deixa de ser raro.
   *
   * ## Encerra pelo mesmo caminho do app
   *
   * `TripsService.finish`, e não um `update` direto no banco, pelo
   * mesmo motivo de `abrirViagemDoDia` usar `start`: é o que garante as
   * mesmas notificações, a mesma auditoria e o mesmo tratamento de
   * aluno sem desembarque. Duas portas para o mesmo fato acabariam
   * divergindo.
   *
   * ## Uma viagem que falha não impede as outras
   *
   * São empresas diferentes. A varredura é best effort por viagem, e o
   * que falhar volta na próxima rodada.
   */
  async encerrarViagensSemSinal(agora = new Date()): Promise<{
    avaliadas: number;
    encerradas: number;
    falhas: number;
  }> {
    const limite = new Date(agora.getTime() - this.config.minutosSemSinalParaEncerrar * 60_000);
    const abandonadas = await this.trips.listSemSinalAcrossTenants(limite, LIMITE_POR_VARREDURA);

    let encerradas = 0;
    let falhas = 0;

    for (const viagem of abandonadas) {
      try {
        await this.tripsService.finish(
          viagem.id,
          this.atorDoRastreador(viagem.companyId, viagem.motoristaId),
          {},
        );
        encerradas += 1;
        this.logger.warn(
          `Viagem ${viagem.id} encerrada por falta de sinal: ultima posicao em ${viagem.ultimoSinalEm.toISOString()}, mais de ${this.config.minutosSemSinalParaEncerrar} minutos atras.`,
        );
      } catch (erro) {
        falhas += 1;
        this.logger.warn(
          `Nao foi possivel encerrar a viagem ${viagem.id} por falta de sinal: ${
            erro instanceof Error ? erro.message : "erro desconhecido"
          }`,
        );
      }
    }

    return { avaliadas: abandonadas.length, encerradas, falhas };
  }

  /**
   * O IMEI é único GLOBAL (o mesmo aparelho não pode estar em dois
   * ônibus, nem de empresas diferentes), e a busca por ele faz bypass
   * de RLS porque não existe ator: quem fala aqui é um aparelho, e o
   * tenant só é descoberto DEPOIS de achar o ônibus. Mesmo caso já
   * documentado no login, que resolve `Membership` antes de haver
   * tenant. Tudo isso é contrato de `findByRastreadorImei`.
   */
  private acharVeiculoPorImei(imei: string): Promise<Vehicle | null> {
    return this.vehicles.findByRastreadorImei(imei);
  }

  /**
   * `fixTime` é quando o ônibus ESTEVE naquele ponto; `serverTime` é
   * quando o pacote chegou. Num aparelho que guardou posições offline e
   * despejou tudo ao recuperar sinal, os dois diferem em horas — usar
   * `serverTime` desenharia o trajeto inteiro no instante da reconexão.
   */
  private instanteDaPosicao(payload: TraccarForwardDto): Date {
    const bruto = payload.fixTime ?? payload.deviceTime ?? payload.serverTime;
    const data = bruto ? new Date(bruto) : new Date();
    return Number.isNaN(data.getTime()) ? new Date() : data;
  }

  /**
   * Abre a viagem do dia a partir do que a operação já configurou: a
   * rota que tem ESTE ônibus como veículo padrão.
   *
   * Reusa `TripsService.start` inteiro de propósito, em vez de criar a
   * `Trip` direto no banco — é o que garante que o ônibus com
   * rastreador dispare exatamente as mesmas notificações ("a van está
   * em serviço"), a mesma semeadura de ausências e a mesma auditoria
   * que o ônibus tocado pelo app. Duas portas para o mesmo fato
   * acabariam divergindo.
   */
  private async abrirViagemDoDia(
    veiculo: Vehicle,
    posicao: PosicaoObservada,
  ): Promise<string | null> {
    const designacao = await this.acharDesignacaoDoDia(veiculo);
    if (!designacao) {
      await this.avisarQueLigouSemEscala(veiculo, posicao);
      return null;
    }

    try {
      const trip = await this.tripsService.start(
        {
          routeId: designacao.routeId,
          veiculoId: veiculo.id,
          ...(designacao.monitorId ? { monitorId: designacao.monitorId } : {}),
        },
        this.atorDoRastreador(veiculo.companyId, designacao.motoristaId),
        {},
      );
      return trip.id;
    } catch (erro) {
      // Conflito legítimo e comum: a viagem já foi aberta pelo app, ou
      // duas posições chegaram juntas na virada da ignição. Não é erro
      // de sistema, e não pode virar retentativa infinita.
      this.logger.warn(
        `Não foi possível abrir viagem para ${veiculo.numeroFrota ?? veiculo.placa}: ${
          erro instanceof Error ? erro.message : "erro desconhecido"
        }`,
      );
      return null;
    }
  }

  /**
   * O ônibus ligou a ignição e ninguém disse o que ele faz hoje.
   *
   * ## Por que isto não pode ser só uma linha no log
   *
   * É o caso mais comum do transporte escolar municipal, e não é
   * exceção: o despachante remaneja de manhã, o carro que era da linha
   * do Ubatiba vai para a do Silvado porque outro quebrou, e a escala
   * não foi registrada. Até 26/10/2026 isso virava um aviso que ninguém
   * lia, o ônibus rodava o dia inteiro sem viagem aberta, e a família
   * não via nada.
   *
   * ## O letreiro mente, o trajeto não
   *
   * A pergunta natural é ler o letreiro. **Rastreador não lê letreiro**:
   * não existe sensor para isso, e quem o escreve é a mão do motorista,
   * que esquece de trocar. O que ele não tem como esquecer é passar
   * pelas ruas por onde passou. Então a dedução sai da posição, que o
   * aparelho manda de graça, e `sugerirRotaPeloTrajeto` faz a conta.
   *
   * ## Sugere, nunca decide
   *
   * Abrir a viagem na rota deduzida trocaria a lista de crianças que
   * deveriam estar dentro do ônibus, e isso não é decisão de
   * heurística. O que sai daqui é um aviso com nome da rota, distância
   * e motivo, para uma pessoa confirmar em um toque.
   */
  private async avisarQueLigouSemEscala(
    veiculo: Vehicle,
    posicao: PosicaoObservada,
  ): Promise<void> {
    const identificacao = veiculo.numeroFrota ?? veiculo.placa;

    let sugestao: ReturnType<typeof sugerirRotaPeloTrajeto> = null;
    try {
      const candidatas = await this.routes.listCandidatasParaSugestaoAcrossTenants(
        veiculo.companyId,
      );
      sugestao = sugerirRotaPeloTrajeto(
        [posicao],
        candidatas.map((rota) => ({
          id: rota.id,
          nome: rota.nome,
          turno: rota.turno,
          paradas: rota.paradas.map((parada) => ({
            latitude: Number(parada.latitude),
            longitude: Number(parada.longitude),
            horarioPrevisto: parada.horarioPrevisto,
          })),
        })),
      );
    } catch (erro) {
      /* A sugestão é um extra. Se a consulta falhar, o aviso de que o
         ônibus ligou sem escala continua saindo, que é o que importa. */
      this.logger.warn(
        `Não foi possível sugerir rota para ${identificacao}: ${
          erro instanceof Error ? erro.message : "erro desconhecido"
        }`,
      );
    }

    if (sugestao && sugestao.confianca >= CONFIANCA_PARA_SUGERIR) {
      this.logger.warn(
        `Onibus ${identificacao} ligou a ignicao sem escala de hoje. Pelo trajeto, parece a rota "${sugestao.nome}" (${sugestao.confianca}% de confianca). ${sugestao.motivo} Confirme no painel do Despachante para a viagem abrir.`,
      );
      return;
    }

    this.logger.warn(
      `Onibus ${identificacao} ligou a ignicao sem escala de hoje, e o trajeto nao identifica a rota${
        sugestao ? `: ${sugestao.motivo}` : ""
      } Designe no painel do Despachante.`,
    );
  }

  private async encerrarViagem(veiculo: Vehicle, tripId: string): Promise<void> {
    const designacao = await this.acharDesignacaoDoDia(veiculo);
    if (!designacao) return;

    try {
      await this.tripsService.finish(
        tripId,
        this.atorDoRastreador(veiculo.companyId, designacao.motoristaId),
        {},
      );
    } catch (erro) {
      this.logger.warn(
        `Não foi possível encerrar a viagem ${tripId}: ${
          erro instanceof Error ? erro.message : "erro desconhecido"
        }`,
      );
    }
  }

  /**
   * Qual rota este ônibus faz hoje, com quem.
   *
   * A precedência é a regra central do fluxo do despachante:
   *
   * 1. **Escala do dia** (`RouteAssignment`) — o rodízio. Se o
   *    despachante designou este ônibus para uma rota hoje, é essa,
   *    com o motorista que ELE escolheu.
   * 2. **Padrão da rota** (`Route.veiculoPadraoId`) — o caso fixo, que
   *    dispensa escala e continua funcionando exatamente como antes.
   *
   * Se o ônibus tem mais de uma escala hoje (manhã e tarde, o caso
   * normal), vale a primeira cuja viagem ainda não foi encerrada — é o
   * que faz a chave virada às 6h abrir a rota da manhã e a virada ao
   * meio-dia abrir a da tarde, sem ninguém escolher nada.
   */
  private async acharDesignacaoDoDia(veiculo: Vehicle): Promise<DesignacaoDoDia | null> {
    // O dia CIVIL BRASILEIRO, não o dia UTC. O servidor roda em UTC e o
    // Brasil está três horas atrás: entre 21h e meia-noite de Brasília,
    // "hoje em UTC" já é amanhã. O ônibus que ligava a ignição às 21h30
    // procurava a escala do dia seguinte, não achava nada, e a viagem
    // não abria. Para a família, aquele ônibus não existia, justamente
    // no turno da noite.
    const hoje = inicioDoDiaNaOperacao();

    // Já vem sem as escalas que apontam para rota arquivada — filtrar
    // rota viável é condição da consulta, não regra daqui.
    const viaveis = await this.escalas.listDoDiaPorVeiculo(veiculo.companyId, veiculo.id, hoje);

    if (viaveis.length > 0) {
      const pendente = await this.primeiraEscalaSemViagemEncerrada(viaveis, hoje);
      if (pendente) {
        return {
          routeId: pendente.routeId,
          motoristaId: pendente.motoristaId,
          monitorId: pendente.monitorId,
        };
      }
      // Todas as escalas do dia já rodaram. Ligar a chave de novo
      // (manobra na garagem depois do expediente) não pode reabrir uma
      // viagem que já terminou.
      return null;
    }

    const rota = await this.routes.findAtivaPorVeiculoPadrao(veiculo.companyId, veiculo.id);
    if (!rota?.motoristaPadraoId) {
      if (rota) {
        this.logger.warn(`Rota ${rota.nome} sem motorista designado: viagem não aberta.`);
      }
      return null;
    }

    return {
      routeId: rota.id,
      motoristaId: rota.motoristaPadraoId,
      monitorId: rota.monitorPadraoId,
    };
  }

  /** A primeira escala do dia cuja viagem ainda não foi encerrada. */
  private async primeiraEscalaSemViagemEncerrada(
    escalas: { routeId: string; motoristaId: string; monitorId: string | null }[],
    hoje: Date,
  ): Promise<{ routeId: string; motoristaId: string; monitorId: string | null } | null> {
    const jaRodaram = new Set(
      await this.trips.listRouteIdsComViagemEncerrada(
        escalas.map((escala) => escala.routeId),
        hoje,
      ),
    );
    return escalas.find((escala) => !jaRodaram.has(escala.routeId)) ?? null;
  }

  private async gravarNaViagem(
    tripId: string,
    veiculo: Vehicle,
    payload: TraccarForwardDto,
    capturadaEm: Date,
  ): Promise<void> {
    await this.positionRepository.create({
      tripId,
      companyId: veiculo.companyId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      // O Traccar encaminha em NÓS. Gravar sem converter mostraria um
      // ônibus a 30 km/h como se estivesse a 16.
      velocidadeKmh: payload.speed != null ? payload.speed * KMH_POR_NO : undefined,
      capturadaEm,
    });

    await this.vehiclesService.updateLocationFromTrip(veiculo.id, {
      latitude: payload.latitude,
      longitude: payload.longitude,
      capturadaEm,
      viagemId: tripId,
    });
  }

  /**
   * O ator que representa o rastreador ao abrir/encerrar viagem.
   *
   * `sub` é o MOTORISTA designado — é ele quem virou a chave, e é o
   * nome que tem de aparecer na auditoria. `role` é `EMPRESA` porque a
   * autoridade exercida é a da transportadora: o aparelho é dela, no
   * ônibus dela, e `TripsService.start` exige papel de gestão para
   * abrir viagem de uma rota em nome de outra pessoa (com `MOTORISTA`,
   * a checagem de veículo se restringiria ao carro vinculado àquele
   * motorista e recusaria o rodízio).
   *
   * É deliberado e está escrito aqui porque um ator sintético é
   * exatamente o tipo de coisa que, sem explicação, alguém copia para
   * um lugar onde não vale.
   */
  private atorDoRastreador(companyId: string, motoristaId: string): AuthenticatedUser {
    return {
      sub: motoristaId,
      tenantId: companyId,
      role: Role.EMPRESA,
      vinculoId: motoristaId,
    };
  }
}
