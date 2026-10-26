import type {
  RouteStatus,
  SchoolShift,
  TripSentido,
  TripStatus,
  TripStudentEventType,
  VehicleOccurrenceSeverity,
} from "@prisma/client";

/** Como o despachante chama um carro: pelo número, e pela placa quando não há número. */
export interface VeiculoIdentificado {
  id: string;
  numeroFrota: string | null;
  placa: string;
  modelo: string;
  /** Presente = o carro tem rastreador vinculado. O painel nunca promete posição de quem não tem aparelho. */
  rastreadorImei: string | null;
}

/**
 * A última posição conhecida de uma viagem.
 *
 * `capturadaEm` é o horário do APARELHO, não o da gravação. É o que
 * decide se a posição ainda vale como "ao vivo" ou se já é passado, e
 * confundir os dois é exatamente como se mostra um ônibus parado num
 * ponto onde ele não está mais.
 */
export interface PosicaoConhecida {
  latitude: number;
  longitude: number;
  velocidadeKmh: number | null;
  capturadaEm: Date;
}

/** Uma viagem do dia, com tudo que o painel precisa para desenhar o marcador e a linha da lista. */
export interface ViagemDoDia {
  id: string;
  codigo: string;
  status: TripStatus;
  sentido: TripSentido;
  iniciadaEm: Date;
  finalizadaEm: Date | null;
  canceladaEm: Date | null;
  rota: { id: string; nome: string; turno: SchoolShift };
  veiculo: VeiculoIdentificado;
  motorista: { id: string; nome: string };
  monitor: { id: string; nome: string } | null;
  ultimaPosicao: PosicaoConhecida | null;
  /**
   * A penúltima posição, quando existe.
   *
   * Existe por um caso concreto: nem todo aparelho informa velocidade.
   * O rastreador Teltonika informa e o celular do motorista quase
   * sempre informa, mas `coords.speed` volta `null` em alguns
   * aparelhos Android. Sem velocidade, a única forma honesta de saber
   * se o ônibus anda é comparar duas posições seguidas. Sem esta, o
   * painel teria que chutar.
   */
  posicaoAnterior: PosicaoConhecida | null;
}

/**
 * Uma rota ativa da empresa, com a janela de horário tirada das
 * paradas.
 *
 * Os dois horários são `null` quando a rota não tem parada cadastrada,
 * e isso **não é um defeito**: no transporte público escolar a rota
 * muitas vezes não tem ponto fixo, cada uma com a sua dinâmica. O
 * painel mostra "sem horário previsto" nesse caso em vez de inventar
 * uma janela.
 */
export interface RotaAtiva {
  id: string;
  nome: string;
  turno: SchoolShift;
  status: RouteStatus;
  horarioPrimeiraParada: string | null;
  horarioUltimaParada: string | null;
  alunos: number;
  veiculoPadrao: VeiculoIdentificado | null;
}

/** Uma linha da escala do dia, já com os nomes resolvidos. */
export interface LinhaDaEscala {
  routeId: string;
  rotaNome: string;
  turno: SchoolShift;
  veiculo: VeiculoIdentificado;
  motoristaNome: string;
  monitorNome: string | null;
  observacao: string | null;
}

/** Uma ocorrência registrada em um veículo da empresa. */
export interface OcorrenciaDoDia {
  id: string;
  titulo: string;
  descricao: string;
  severidade: VehicleOccurrenceSeverity;
  registradaEm: Date;
  veiculo: VeiculoIdentificado;
}

/** Um embarque, uma ausência ou um desembarque registrado hoje. */
export interface EventoDeAlunoDoDia {
  id: string;
  tipo: TripStudentEventType;
  processadoEm: Date;
  alunoNome: string;
  rotaNome: string;
}

/**
 * As leituras do painel do despachante.
 *
 * Todas escopadas pelo tenant do ator (RLS), e todas de SOMENTE
 * LEITURA: este módulo não escreve nada. Quem muda escala é
 * `RouteAssignmentsService`, quem troca o carro da viagem é
 * `TripsService`, e manter a leitura separada da escrita é o que
 * permite o painel recarregar a cada poucos segundos sem risco.
 *
 * São consultas separadas em vez de uma só por um motivo prático: a
 * tela mostra seis blocos independentes, e um bloco que falhe não pode
 * derrubar os outros cinco. O serviço as dispara em paralelo.
 *
 * Todo método recebe `companyId` explícito **além** da RLS, pelo mesmo
 * motivo de `PrismaDashboardRepository`: a RLS é a rede de segurança,
 * não o filtro. Um `where` explícito falha na hora e no lugar certo se
 * alguém chamar isto de um contexto sem tenant; uma consulta que se
 * apoia só na RLS devolve lista vazia e parece dado inexistente.
 */
export interface DispatchRepository {
  /**
   * O fuso horário cadastrado da empresa.
   *
   * Não é detalhe: `RouteStop.horarioPrevisto` é um texto de relógio de
   * parede ("06:30"), e o servidor roda em UTC. Comparar os dois sem
   * converter dá três horas de erro em Maricá, o que transformaria toda
   * rota da manhã em rota atrasada.
   */
  buscarFusoHorario(companyId: string): Promise<string>;

  /** Quantos carros a empresa tem, e quantos já têm rastreador vinculado. */
  contarFrota(companyId: string): Promise<{ total: number; comRastreador: number }>;

  /** Quantos motoristas e monitores ativos a empresa tem no total. */
  contarEquipe(companyId: string): Promise<{ motoristas: number; monitores: number }>;

  /**
   * Todas as viagens de um dia, em qualquer estado.
   *
   * Em qualquer estado de propósito: o painel precisa distinguir "a
   * rota ainda não saiu" de "a rota já voltou", e as duas são ausência
   * de viagem EM_ANDAMENTO. Sem as finalizadas, as duas situações
   * ficariam idênticas na tela.
   */
  listarViagensDoDia(companyId: string, dia: Date): Promise<ViagemDoDia[]>;

  /** As rotas ativas da empresa, com janela de horário e contagem de alunos. */
  listarRotasAtivas(companyId: string): Promise<RotaAtiva[]>;

  /** A escala publicada para um dia. */
  listarEscalaDoDia(companyId: string, dia: Date): Promise<LinhaDaEscala[]>;

  /** As ocorrências de veículo registradas a partir de um instante. */
  listarOcorrenciasDesde(companyId: string, desde: Date): Promise<OcorrenciaDoDia[]>;

  /** Os eventos de aluno (embarque, ausência, desembarque) mais recentes a partir de um instante. */
  listarEventosDeAlunoDesde(
    companyId: string,
    desde: Date,
    limite: number,
  ): Promise<EventoDeAlunoDoDia[]>;
}
