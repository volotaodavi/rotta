import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { TraccarForwardDto } from "./dto/traccar-forward.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { TrackersConfig } from "@/config/trackers.config";
import type { TripPositionRepository } from "@/modules/trips/repositories/trip-position.repository";
import type { Route, Vehicle } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { TRIP_POSITION_REPOSITORY } from "@/modules/trips/trips.constants";
import { TripsService } from "@/modules/trips/trips.service";
import { VehiclesService } from "@/modules/vehicles/vehicles.service";
import { Role } from "@/shared/enums";

/** Um nó é 1,852 km/h — o Traccar encaminha velocidade em nós, sem converter. */
const KMH_POR_NO = 1.852;

/**
 * O que aconteceu com uma posição recebida. Devolvido ao receptor só
 * para diagnóstico: o Traccar ignora o corpo da resposta, mas quem
 * estiver depurando uma instalação precisa ver por que a posição não
 * virou nada.
 */
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
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
    private readonly tripsService: TripsService,
    @Inject(TRIP_POSITION_REPOSITORY)
    private readonly positionRepository: TripPositionRepository,
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
      const tripId = await this.abrirViagemDoDia(veiculo);
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
        motivo: "Ônibus sem viagem aberta — posição registrada só na frota.",
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
   * `withBypass` porque não existe ator: quem fala aqui é um aparelho, e
   * o tenant só é descoberto DEPOIS de achar o ônibus. Mesmo caso já
   * documentado no login, que resolve `Membership` antes de haver
   * tenant.
   */
  private acharVeiculoPorImei(imei: string): Promise<Vehicle | null> {
    return this.prisma.withBypass(
      this.prisma.vehicle.findFirst({ where: { rastreadorImei: imei, deletedAt: null } }),
    );
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
  private async abrirViagemDoDia(veiculo: Vehicle): Promise<string | null> {
    const rota = await this.acharRotaDoVeiculo(veiculo);
    if (!rota) {
      this.logger.warn(
        `Ônibus ${veiculo.numeroFrota ?? veiculo.placa} ligou a ignição sem rota designada.`,
      );
      return null;
    }
    if (!rota.motoristaPadraoId) {
      this.logger.warn(`Rota ${rota.nome} sem motorista designado — viagem não aberta.`);
      return null;
    }

    try {
      const trip = await this.tripsService.start(
        { routeId: rota.id, veiculoId: veiculo.id },
        this.atorDoRastreador(rota.companyId, rota.motoristaPadraoId),
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

  private async encerrarViagem(veiculo: Vehicle, tripId: string): Promise<void> {
    const rota = await this.acharRotaDoVeiculo(veiculo);
    const motoristaId = rota?.motoristaPadraoId;
    if (!motoristaId) return;

    try {
      await this.tripsService.finish(
        tripId,
        this.atorDoRastreador(veiculo.companyId, motoristaId),
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

  private acharRotaDoVeiculo(veiculo: Vehicle): Promise<Route | null> {
    return this.prisma.withBypass(
      this.prisma.route.findFirst({
        where: {
          companyId: veiculo.companyId,
          veiculoPadraoId: veiculo.id,
          status: "ATIVA",
          deletedAt: null,
        },
      }),
    );
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
