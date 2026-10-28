import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  DISPATCH_REPOSITORY,
  LIMITE_DE_EVENTOS_RECENTES,
  MINUTOS_PARA_ROTA_ATRASADA,
  VELOCIDADE_MINIMA_DE_MOVIMENTO_KMH,
} from "./dispatch.constants";

import type {
  AlertaDoPainelDto,
  EventoRecenteDto,
  LinhaDaEscalaDoDiaDto,
  PainelDoDespachanteResponseDto,
  RotaDoDiaDto,
  SituacaoDaRota,
  SituacaoDoVeiculo,
  VeiculoNoMapaDto,
} from "./dto/painel-do-despachante-response.dto";
import type {
  DispatchRepository,
  EventoDeAlunoDoDia,
  LinhaDaEscala,
  OcorrenciaDoDia,
  RotaAtiva,
  VeiculoIdentificado,
  ViagemDoDia,
} from "./repositories/dispatch.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { TrackersConfig } from "@/config/trackers.config";

import { Role } from "@/shared/enums";
import { inicioDoDiaNaOperacao } from "@/shared/utils/dia.util";
import { haversineDistanceKm } from "@/shared/utils/geo.util";

/**
 * Metros entre duas posições seguidas a partir dos quais o ônibus
 * conta como em movimento, quando o aparelho não informa velocidade.
 *
 * Cinquenta metros é maior que o erro típico de um GPS urbano (cinco a
 * quinze metros, e até trinta entre prédios) e menor que um quarteirão.
 * Abaixo disso o deslocamento pode ser só o sinal tremendo.
 */
const DESLOCAMENTO_MINIMO_METROS = 50;

/** O dia de trabalho corrente — `Trip.data` é `@db.Date`, ver `inicioDoDiaNaOperacao`. */
function hojeUtc(): Date {
  return inicioDoDiaNaOperacao();
}

/** Como o despachante chama o carro: pelo número, e pela placa quando não há número. */
function identificar(veiculo: VeiculoIdentificado): string {
  return veiculo.numeroFrota ? `Ônibus ${veiculo.numeroFrota}` : veiculo.placa;
}

/** `"06:30"` em minutos desde a meia-noite, ou `null` quando o texto não é um horário. */
function minutosDoHorario(horario: string | null): number | null {
  if (!horario) return null;
  const casamento = /^(\d{1,2}):(\d{2})$/.exec(horario.trim());
  if (!casamento) return null;
  const horas = Number(casamento[1]);
  const minutos = Number(casamento[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

/** Minutos decorridos entre dois instantes, nunca negativo. */
function minutosEntre(inicio: Date, fim: Date): number {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 60_000));
}

/**
 * Que horas são, em minutos desde a meia-noite, no fuso da empresa.
 *
 * O servidor roda em UTC e `RouteStop.horarioPrevisto` é relógio de
 * parede. Sem esta conversão, às 06h31 de Maricá o servidor acharia
 * que são 09h31 e marcaria como atrasada toda rota da manhã, no dia da
 * demonstração.
 *
 * `en-GB` com `hour12: false` devolve `HH:MM:SS`; um fuso inválido no
 * cadastro faria `toLocaleTimeString` lançar, então o `catch` cai no
 * horário de Brasília em vez de derrubar o painel inteiro por causa de
 * um campo de cadastro.
 */
function minutosDoDiaNoFuso(agora: Date, fusoHorario: string): number {
  const formatar = (fuso: string): string =>
    agora.toLocaleTimeString("en-GB", { timeZone: fuso, hour12: false });
  let relogio: string;
  try {
    relogio = formatar(fusoHorario);
  } catch {
    relogio = formatar("America/Sao_Paulo");
  }
  const [horas, minutos] = relogio.split(":");
  return Number(horas) * 60 + Number(minutos);
}

/**
 * Painel Geral do Despachante.
 *
 * ## O que esta classe é, e o que ela recusa ser
 *
 * É LEITURA, e só. Nenhum método aqui escreve. Quem troca o carro da
 * viagem continua sendo `TripsService.substituirVeiculo` (que notifica
 * as famílias) e quem escala continua sendo `RouteAssignmentsService`.
 * A separação não é organizacional: é o que permite esta tela
 * recarregar a cada poucos segundos sem nenhum risco de efeito
 * colateral.
 *
 * ## A regra que atravessa o arquivo inteiro
 *
 * **O painel nunca afirma o que não sabe.** Em cada decisão abaixo,
 * quando faltou dado a resposta é um estado explícito de ausência, e
 * não um valor plausível:
 *
 *  - Carro sem posição recente vira `SEM_SINAL`, com a idade da última
 *    posição ao lado, e não um marcador parado onde ele estava.
 *  - Carro sem rastreador vira `SEM_RASTREADOR`, que é outra coisa.
 *  - Rota sem parada cadastrada fica sem janela de horário, porque no
 *    transporte público escolar a rota muitas vezes não tem ponto
 *    fixo. Sem horário previsto não existe atraso para calcular, e o
 *    painel não inventa um.
 *  - Indicador sem denominador honesto tem `total: null` em vez de um
 *    denominador de enfeite.
 *
 * Isto não é preciosismo. Um painel que mostra o ônibus parado no
 * mesmo ponto porque o sinal caiu é pior que um painel que diz "sem
 * sinal há 40 minutos": o primeiro faz o despachante não ligar para o
 * motorista.
 */
@Injectable()
export class DispatchService {
  constructor(
    @Inject(DISPATCH_REPOSITORY) private readonly repository: DispatchRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * O tempo sem posição a partir do qual a viagem conta como muda.
   *
   * É o MESMO número que encerra a viagem sozinha
   * (`TRACKER_TIMEOUT_MINUTOS`), de propósito: se o painel usasse um
   * limite próprio, haveria uma janela em que a tela diz "sem sinal" e
   * a viagem continua aberta, ou pior, o contrário.
   */
  private get minutosParaSemSinal(): number {
    return this.config.get<TrackersConfig>("trackers")?.minutosSemSinalParaEncerrar ?? 20;
  }

  async carregarPainel(
    actor: AuthenticatedUser,
    companyIdParam?: string,
  ): Promise<PainelDoDespachanteResponseDto> {
    const companyId = this.resolverEmpresa(actor, companyIdParam);
    const dia = hojeUtc();
    const agora = new Date();

    const [fusoHorario, frota, equipe, viagens, rotas, escala, ocorrencias, eventosDeAluno] =
      await Promise.all([
        this.repository.buscarFusoHorario(companyId),
        this.repository.contarFrota(companyId),
        this.repository.contarEquipe(companyId),
        this.repository.listarViagensDoDia(companyId, dia),
        this.repository.listarRotasAtivas(companyId),
        this.repository.listarEscalaDoDia(companyId, dia),
        this.repository.listarOcorrenciasDesde(companyId, dia),
        this.repository.listarEventosDeAlunoDesde(companyId, dia, LIMITE_DE_EVENTOS_RECENTES),
      ]);

    const emCurso = viagens.filter(
      (viagem) => viagem.status === "EM_ANDAMENTO" || viagem.status === "PAUSADA",
    );
    const veiculos = emCurso.map((viagem) => this.montarVeiculo(viagem, agora));
    const rotasDoDia = this.montarRotasDoDia(rotas, viagens, escala, agora, fusoHorario);

    return {
      atualizadoEm: agora,
      indicadores: {
        veiculosEmOperacao: { atual: emCurso.length, total: frota.total },
        rotasEmAndamento: { atual: emCurso.length, total: rotas.length },
        // Uma pessoa pode estar em duas viagens no mesmo dia (ida e
        // volta): contar viagens daria número maior que a equipe.
        motoristasEmAtividade: {
          atual: new Set(emCurso.map((viagem) => viagem.motorista.id)).size,
          total: equipe.motoristas,
        },
        monitoresEmAtividade: {
          atual: new Set(
            emCurso.map((viagem) => viagem.monitor?.id).filter((id): id is string => Boolean(id)),
          ).size,
          total: equipe.monitores,
        },
        ocorrenciasHoje: { atual: ocorrencias.length, total: null },
        veiculosSemRastreador: frota.total - frota.comRastreador,
      },
      veiculos,
      rotasDoDia,
      alertas: this.montarAlertas(veiculos, rotasDoDia, ocorrencias, emCurso, agora),
      eventosRecentes: this.montarEventosRecentes(viagens, ocorrencias, eventosDeAluno),
      escalaDoDia: this.montarEscala(escala, rotasDoDia),
    };
  }

  /**
   * De qual empresa é este painel.
   *
   * `ADMIN_ROTTA` não tem tenant, então precisa dizer de qual empresa
   * quer o painel. Empresa e gestor nunca escolhem: é a própria, e
   * aceitar `companyId` deles abriria a porta para olhar o painel de
   * outra transportadora pela query string.
   */
  private resolverEmpresa(actor: AuthenticatedUser, companyIdParam?: string): string {
    if (actor.role === Role.ADMIN_ROTTA) {
      if (!companyIdParam) {
        throw new BadRequestException(
          "Informe a transportadora (companyId) para abrir o painel do despachante.",
        );
      }
      return companyIdParam;
    }
    if (!actor.tenantId) {
      throw new BadRequestException(
        "Esta conta não está vinculada a uma transportadora, então não há painel para abrir.",
      );
    }
    return actor.tenantId;
  }

  /** Um marcador do mapa, com o frescor do sinal declarado em vez de escondido. */
  private montarVeiculo(viagem: ViagemDoDia, agora: Date): VeiculoNoMapaDto {
    const posicao = viagem.ultimaPosicao;
    const minutos = posicao ? minutosEntre(posicao.capturadaEm, agora) : null;

    return {
      tripId: viagem.id,
      veiculoId: viagem.veiculo.id,
      rotaId: viagem.rota.id,
      rotaNome: viagem.rota.nome,
      turno: viagem.rota.turno,
      identificacao: identificar(viagem.veiculo),
      placa: viagem.veiculo.placa,
      motoristaNome: viagem.motorista.nome,
      monitorNome: viagem.monitor?.nome ?? null,
      situacao: this.situacaoDoVeiculo(viagem, minutos),
      latitude: posicao?.latitude ?? null,
      longitude: posicao?.longitude ?? null,
      velocidadeKmh: posicao?.velocidadeKmh ?? null,
      posicaoCapturadaEm: posicao?.capturadaEm ?? null,
      minutosDesdeAPosicao: minutos,
    };
  }

  /**
   * Em movimento, parado, sem sinal ou sem rastreador.
   *
   * A ordem das perguntas importa e é esta:
   *
   * 1. **Nunca mandou posição e não tem aparelho** vira
   *    `SEM_RASTREADOR`. É um problema de equipamento, não de sinal, e
   *    quem resolve é quem compra, não quem despacha.
   * 2. **Sem posição, ou posição velha**, vira `SEM_SINAL`. O limite é
   *    o mesmo que encerra a viagem sozinha.
   * 3. **Com velocidade informada**, decide pela velocidade.
   * 4. **Sem velocidade**, decide pelo deslocamento entre as duas
   *    últimas posições, que é a única evidência que sobra.
   * 5. **Sem nenhuma das duas** (primeira posição da viagem, aparelho
   *    que não informa velocidade), responde `PARADO`. É o palpite
   *    menos danoso: faz o despachante olhar, e a próxima posição
   *    corrige em segundos.
   */
  private situacaoDoVeiculo(
    viagem: ViagemDoDia,
    minutosDesdeAPosicao: number | null,
  ): SituacaoDoVeiculo {
    const posicao = viagem.ultimaPosicao;
    if (!posicao) {
      return viagem.veiculo.rastreadorImei ? "SEM_SINAL" : "SEM_RASTREADOR";
    }
    if (minutosDesdeAPosicao !== null && minutosDesdeAPosicao >= this.minutosParaSemSinal) {
      return "SEM_SINAL";
    }
    if (posicao.velocidadeKmh !== null) {
      return posicao.velocidadeKmh >= VELOCIDADE_MINIMA_DE_MOVIMENTO_KMH
        ? "EM_MOVIMENTO"
        : "PARADO";
    }
    const anterior = viagem.posicaoAnterior;
    if (!anterior) return "PARADO";
    const metros =
      haversineDistanceKm(
        anterior.latitude,
        anterior.longitude,
        posicao.latitude,
        posicao.longitude,
      ) * 1000;
    return metros >= DESLOCAMENTO_MINIMO_METROS ? "EM_MOVIMENTO" : "PARADO";
  }

  /**
   * As rotas ativas do dia, cada uma com a situação que ela realmente
   * tem agora.
   *
   * A lista parte das ROTAS ATIVAS, não das viagens, e isso é o ponto
   * da tela: a rota que não saiu é justamente a que o despachante
   * precisa ver, e ela não tem viagem para aparecer numa lista de
   * viagens.
   */
  private montarRotasDoDia(
    rotas: RotaAtiva[],
    viagens: ViagemDoDia[],
    escala: LinhaDaEscala[],
    agora: Date,
    fusoHorario: string,
  ): RotaDoDiaDto[] {
    const escalaPorRota = new Map(escala.map((linha) => [linha.routeId, linha]));

    return rotas.map((rota) => {
      // A viagem que vale é a que está em curso; sem nenhuma em curso,
      // a última do dia conta a história (já voltou, ou foi cancelada).
      const doDia = viagens.filter((viagem) => viagem.rota.id === rota.id);
      const viagem =
        doDia.find((item) => item.status === "EM_ANDAMENTO" || item.status === "PAUSADA") ??
        doDia[doDia.length - 1];
      const linhaDaEscala = escalaPorRota.get(rota.id);

      const minutosDeAtraso = this.minutosDeAtraso(rota, viagem, agora, fusoHorario);

      return {
        rotaId: rota.id,
        nome: rota.nome,
        turno: rota.turno,
        situacao: this.situacaoDaRota(viagem, minutosDeAtraso),
        horarioPrevistoInicio: rota.horarioPrimeiraParada,
        horarioPrevistoFim: rota.horarioUltimaParada,
        alunos: rota.alunos,
        tripId: viagem?.id ?? null,
        // A precedência é a mesma do rastreador: o carro da viagem de
        // hoje manda sobre a escala, e a escala manda sobre o padrão
        // da rota. Mostrar o padrão quando existe escala faria o painel
        // discordar do que o motorista está dirigindo.
        veiculoIdentificacao: viagem
          ? identificar(viagem.veiculo)
          : linhaDaEscala
            ? identificar(linhaDaEscala.veiculo)
            : rota.veiculoPadrao
              ? identificar(rota.veiculoPadrao)
              : null,
        motoristaNome: viagem?.motorista.nome ?? linhaDaEscala?.motoristaNome ?? null,
        monitorNome: viagem?.monitor?.nome ?? linhaDaEscala?.monitorNome ?? null,
        minutosDeAtraso,
      };
    });
  }

  /**
   * Quantos minutos a rota está atrasada, ou `null`.
   *
   * `null` em três casos, e os três são honestos: a rota não tem
   * horário previsto (sem parada fixa, o normal no público), a viagem
   * já saiu, ou ainda não deu a hora. Atraso aqui é só um: passou do
   * horário da primeira parada e o ônibus não saiu.
   */
  private minutosDeAtraso(
    rota: RotaAtiva,
    viagem: ViagemDoDia | undefined,
    agora: Date,
    fusoHorario: string,
  ): number | null {
    if (viagem) return null;
    const previsto = minutosDoHorario(rota.horarioPrimeiraParada);
    if (previsto === null) return null;
    const atraso = minutosDoDiaNoFuso(agora, fusoHorario) - previsto;
    return atraso >= MINUTOS_PARA_ROTA_ATRASADA ? atraso : null;
  }

  private situacaoDaRota(
    viagem: ViagemDoDia | undefined,
    minutosDeAtraso: number | null,
  ): SituacaoDaRota {
    if (viagem?.status === "EM_ANDAMENTO") return "EM_ANDAMENTO";
    if (viagem?.status === "PAUSADA") return "PAUSADA";
    if (viagem?.status === "FINALIZADA") return "CONCLUIDA";
    if (viagem?.status === "CANCELADA") return "CANCELADA";
    return minutosDeAtraso === null ? "NAO_INICIADA" : "ATRASADA";
  }

  /**
   * A faixa de alertas: o que precisa de alguém agora.
   *
   * Ordenada por nível e depois por horário, para que o item mais
   * grave esteja sempre no topo sem o despachante procurar. Cada
   * alerta nasce de um FATO registrado, nunca de uma suposição: sem
   * sinal há N minutos, atraso de N minutos sobre o horário da
   * primeira parada, ocorrência que alguém registrou, viagem sem
   * monitor escalado.
   */
  private montarAlertas(
    veiculos: VeiculoNoMapaDto[],
    rotas: RotaDoDiaDto[],
    ocorrencias: OcorrenciaDoDia[],
    emCurso: ViagemDoDia[],
    agora: Date,
  ): AlertaDoPainelDto[] {
    const alertas: AlertaDoPainelDto[] = [];

    for (const veiculo of veiculos) {
      if (veiculo.situacao !== "SEM_SINAL" && veiculo.situacao !== "SEM_RASTREADOR") continue;
      alertas.push({
        id: `sem-sinal:${veiculo.tripId}`,
        nivel: "CRITICO",
        titulo:
          veiculo.situacao === "SEM_RASTREADOR"
            ? `${veiculo.identificacao} sem rastreador`
            : `${veiculo.identificacao} sem sinal`,
        descricao:
          veiculo.situacao === "SEM_RASTREADOR"
            ? "A viagem está aberta, mas este carro não tem aparelho vinculado: não há posição para mostrar às famílias."
            : veiculo.minutosDesdeAPosicao === null
              ? "A viagem está aberta e nenhuma posição chegou ainda."
              : `A última posição chegou há ${veiculo.minutosDesdeAPosicao} min. O mapa mostra onde ele estava, não onde está.`,
        em: veiculo.posicaoCapturadaEm ?? agora,
        rotaNome: veiculo.rotaNome,
        rotaId: veiculo.rotaId,
      });
    }

    for (const rota of rotas) {
      if (rota.situacao !== "ATRASADA" || rota.minutosDeAtraso === null) continue;
      alertas.push({
        id: `atraso:${rota.rotaId}`,
        nivel: "ATENCAO",
        titulo: `${rota.nome} não saiu`,
        descricao: `Previsto para ${rota.horarioPrevistoInicio}, ${rota.minutosDeAtraso} min atrás, e nenhuma viagem foi aberta.`,
        em: agora,
        rotaNome: rota.nome,
        rotaId: rota.rotaId,
      });
    }

    // Monitor é exigência de operação, não detalhe de cadastro: a
    // viagem que roda sem ele é informação que o despachante tem que
    // ver no dia, não no relatório do mês.
    for (const viagem of emCurso) {
      if (viagem.monitor) continue;
      alertas.push({
        id: `sem-monitor:${viagem.id}`,
        nivel: "ATENCAO",
        titulo: `${viagem.rota.nome} sem monitor`,
        descricao: `A viagem ${viagem.codigo} está rodando com ${identificar(viagem.veiculo)} e nenhum monitor designado.`,
        em: viagem.iniciadaEm,
        rotaNome: viagem.rota.nome,
        rotaId: viagem.rota.id,
      });
    }

    for (const ocorrencia of ocorrencias) {
      alertas.push({
        id: `ocorrencia:${ocorrencia.id}`,
        nivel: ocorrencia.severidade === "ALTA" ? "CRITICO" : "ATENCAO",
        titulo: ocorrencia.titulo,
        descricao: `${identificar(ocorrencia.veiculo)}: ${ocorrencia.descricao}`,
        em: ocorrencia.registradaEm,
        rotaNome: null,
        rotaId: null,
      });
    }

    const peso: Record<AlertaDoPainelDto["nivel"], number> = {
      CRITICO: 0,
      ATENCAO: 1,
      INFORMACAO: 2,
    };
    return alertas.sort((a, b) => peso[a.nivel] - peso[b.nivel] || b.em.getTime() - a.em.getTime());
  }

  /**
   * A linha do tempo do dia.
   *
   * Junta três origens (viagem aberta, viagem encerrada, ocorrência,
   * embarque/desembarque) e ordena pelo horário real de cada uma. Sem
   * nenhum evento sintético: tudo aqui aconteceu e está gravado.
   */
  private montarEventosRecentes(
    viagens: ViagemDoDia[],
    ocorrencias: OcorrenciaDoDia[],
    eventosDeAluno: EventoDeAlunoDoDia[],
  ): EventoRecenteDto[] {
    const eventos: EventoRecenteDto[] = [];

    for (const viagem of viagens) {
      eventos.push({
        id: `viagem-iniciada:${viagem.id}`,
        titulo: "Viagem aberta",
        detalhe: `${viagem.rota.nome} · ${identificar(viagem.veiculo)}`,
        em: viagem.iniciadaEm,
      });
      if (viagem.finalizadaEm) {
        eventos.push({
          id: `viagem-finalizada:${viagem.id}`,
          titulo: "Viagem encerrada",
          detalhe: `${viagem.rota.nome} · ${identificar(viagem.veiculo)}`,
          em: viagem.finalizadaEm,
        });
      }
      if (viagem.canceladaEm) {
        eventos.push({
          id: `viagem-cancelada:${viagem.id}`,
          titulo: "Viagem cancelada",
          detalhe: `${viagem.rota.nome} · ${identificar(viagem.veiculo)}`,
          em: viagem.canceladaEm,
        });
      }
    }

    for (const ocorrencia of ocorrencias) {
      eventos.push({
        id: `ocorrencia-evento:${ocorrencia.id}`,
        titulo: "Ocorrência registrada",
        detalhe: `${identificar(ocorrencia.veiculo)} · ${ocorrencia.titulo}`,
        em: ocorrencia.registradaEm,
      });
    }

    const tituloDoEvento: Record<EventoDeAlunoDoDia["tipo"], string> = {
      EMBARCOU: "Embarque registrado",
      DESEMBARCOU: "Desembarque registrado",
      AUSENTE: "Aluno ausente",
    };
    for (const evento of eventosDeAluno) {
      eventos.push({
        id: `aluno:${evento.id}`,
        titulo: tituloDoEvento[evento.tipo],
        detalhe: `${evento.alunoNome} · ${evento.rotaNome}`,
        em: evento.processadoEm,
      });
    }

    return eventos
      .sort((a, b) => b.em.getTime() - a.em.getTime())
      .slice(0, LIMITE_DE_EVENTOS_RECENTES);
  }

  /** A escala do dia, com a situação de cada rota trazida da lista de rotas para não recalcular. */
  private montarEscala(escala: LinhaDaEscala[], rotas: RotaDoDiaDto[]): LinhaDaEscalaDoDiaDto[] {
    const situacaoPorRota = new Map(rotas.map((rota) => [rota.rotaId, rota.situacao]));

    return escala.map((linha) => ({
      rotaId: linha.routeId,
      rotaNome: linha.rotaNome,
      turno: linha.turno,
      veiculoIdentificacao: identificar(linha.veiculo),
      motoristaNome: linha.motoristaNome,
      monitorNome: linha.monitorNome,
      // Rota fora da lista de ativas (pausada depois de escalada) não
      // tem situação calculada: `NAO_INICIADA` é o que de fato se sabe.
      situacao: situacaoPorRota.get(linha.routeId) ?? "NAO_INICIADA",
      observacao: linha.observacao,
    }));
  }
}
