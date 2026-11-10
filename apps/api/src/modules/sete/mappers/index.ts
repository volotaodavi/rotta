import {
  SETE_COR_RACA,
  SETE_LOCALIZACAO,
  SETE_MODO_VEICULO,
  SETE_NIVEL,
  SETE_ORIGEM_VEICULO,
  SETE_SEXO,
  SETE_TIPO_ROTA,
  SETE_TIPO_VEICULO,
  SETE_TURNO,
} from "@rotta/shared-contracts";

import { comprimentoEmKm, montarShape, posicoesConfiaveis } from "../geo";

import type { PosicaoParaShape } from "../geo";
import type {
  SeteAluno,
  SeteMonitor,
  SeteMotorista,
  SeteNivel,
  SeteRota,
  SeteSimNao,
  SeteTipoVeiculo,
  SeteTurno,
  SeteVeiculo,
} from "@rotta/shared-contracts";

/**
 * Conversores da Rotta para o SETE.
 *
 * Funções puras, uma por entidade: entram objetos simples, saem
 * objetos simples. Nenhuma toca banco, rede ou Nest — é o que permite
 * testar cada regra difícil (turno, mediana, nível) em milissegundos, e
 * é por isso que elas não recebem tipos do Prisma.
 *
 * Ver `docs/52-integracao-sete.md`.
 */

const S: SeteSimNao = "S";
const N: SeteSimNao = "N";
const simNao = (valor: boolean): SeteSimNao => (valor ? S : N);

export type TurnoDaRotta = "MANHA" | "TARDE" | "INTEGRAL" | "NOITE" | "PERSONALIZADO";

/** Minutos desde a meia-noite, a partir de `HH:MM`. `null` se não parsear. */
export function minutosDoHorario(horario: string | null | undefined): number | null {
  if (!horario) return null;
  const casou = /^(\d{1,2}):(\d{2})/.exec(horario);
  if (!casou) return null;
  const horas = Number(casou[1]);
  const minutos = Number(casou[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

const formatarHorario = (minutos: number): string =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(Math.round(minutos % 60)).padStart(2, "0")}`;

/**
 * Mediana de uma lista de horários `HH:MM`.
 *
 * Mediana, e não média, porque um único dia de trânsito absurdo ou uma
 * viagem que o motorista esqueceu de encerrar puxaria a média para um
 * horário que nunca aconteceu. A mediana ignora o extremo.
 *
 * Com número par de viagens, é a média dos dois do meio — a definição
 * de mediana, não um arredondamento escolhido aqui.
 */
export function medianaDeHorarios(horarios: (string | null | undefined)[]): string | null {
  const minutos = horarios
    .map(minutosDoHorario)
    .filter((m): m is number => m !== null)
    .sort((a, b) => a - b);

  if (minutos.length === 0) return null;

  const meio = Math.floor(minutos.length / 2);
  const mediana =
    minutos.length % 2 === 1 ? minutos[meio]! : (minutos[meio - 1]! + minutos[meio]!) / 2;

  return formatarHorario(mediana);
}

/**
 * Os três campos de turno do SETE, a partir do turno da Rotta.
 *
 * `INTEGRAL` é o único que liga DOIS campos: no SETE a rota integral é
 * literalmente a que atende de manhã e de tarde, não um terceiro valor.
 *
 * `PERSONALIZADO` não existe no SETE, e por isso é derivado dos
 * horários das paradas: antes do meio-dia é matutino, entre meio-dia e
 * 18h é vespertino, dali em diante é noturno. Uma rota personalizada
 * pode acender mais de um.
 */
export function turnosDaRota(
  turno: TurnoDaRotta,
  horariosDasParadas: (string | null | undefined)[] = [],
): { turno_matutino: SeteSimNao; turno_vespertino: SeteSimNao; turno_noturno: SeteSimNao } {
  if (turno === "MANHA") return { turno_matutino: S, turno_vespertino: N, turno_noturno: N };
  if (turno === "TARDE") return { turno_matutino: N, turno_vespertino: S, turno_noturno: N };
  if (turno === "NOITE") return { turno_matutino: N, turno_vespertino: N, turno_noturno: S };
  if (turno === "INTEGRAL") return { turno_matutino: S, turno_vespertino: S, turno_noturno: N };

  const minutos = horariosDasParadas.map(minutosDoHorario).filter((m): m is number => m !== null);

  return {
    turno_matutino: simNao(minutos.some((m) => m < 12 * 60)),
    turno_vespertino: simNao(minutos.some((m) => m >= 12 * 60 && m < 18 * 60)),
    turno_noturno: simNao(minutos.some((m) => m >= 18 * 60)),
  };
}

export interface ViagemParaRota {
  sentido: "IDA" | "VOLTA";
  iniciadaEm: Date;
  finalizadaEm: Date | null;
}

/** `HH:MM` no fuso da operação (America/Sao_Paulo), nunca em UTC. */
function horarioLocal(instante: Date): string {
  return instante.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export interface RotaDaRotta {
  id: string;
  nome: string;
  turno: TurnoDaRotta;
  acessoPorteira: boolean;
  acessoMataBurro: boolean;
  acessoColchete: boolean;
  acessoAtoleiro: boolean;
  acessoPonteRustica: boolean;
  /** Em ordem de parada. */
  horariosDasParadas: (string | null)[];
  /** Últimas viagens FINALIZADAS, mais recentes primeiro. */
  viagensFinalizadas: ViagemParaRota[];
  /** Posições da viagem mais recente com GPS. */
  posicoesDaViagemMaisRecente: PosicaoParaShape[];
}

/** Quantas viagens entram na mediana (RN-SETE-07). */
export const VIAGENS_NA_MEDIANA = 20;

export function toSeteRota(rota: RotaDaRotta): SeteRota {
  const ultimas = (sentido: "IDA" | "VOLTA"): ViagemParaRota[] =>
    rota.viagensFinalizadas.filter((v) => v.sentido === sentido).slice(0, VIAGENS_NA_MEDIANA);

  const ida = ultimas("IDA");
  const volta = ultimas("VOLTA");

  const primeiraParada = rota.horariosDasParadas[0] ?? null;
  const ultimaParada = rota.horariosDasParadas[rota.horariosDasParadas.length - 1] ?? null;

  // O que aconteceu tem precedência sobre o que foi planejado: o SETE
  // presta contas de OPERAÇÃO. Sem viagem finalizada, cai para o
  // horário previsto — e a rota entra em pendência (RN-SETE-07).
  const horaIdaInicio =
    medianaDeHorarios(ida.map((v) => horarioLocal(v.iniciadaEm))) ?? primeiraParada;
  const horaIdaTermino =
    medianaDeHorarios(ida.map((v) => (v.finalizadaEm ? horarioLocal(v.finalizadaEm) : null))) ??
    ultimaParada;
  const horaVoltaInicio = medianaDeHorarios(volta.map((v) => horarioLocal(v.iniciadaEm)));
  const horaVoltaTermino = medianaDeHorarios(
    volta.map((v) => (v.finalizadaEm ? horarioLocal(v.finalizadaEm) : null)),
  );

  const confiaveis = posicoesConfiaveis(rota.posicoesDaViagemMaisRecente);
  const km = confiaveis.length >= 2 ? comprimentoEmKm(confiaveis).toFixed(1) : null;

  const duracoes = rota.viagensFinalizadas
    .filter((v) => v.finalizadaEm)
    .map((v) => (v.finalizadaEm!.getTime() - v.iniciadaEm.getTime()) / 60_000)
    .filter((m) => m > 0)
    .sort((a, b) => a - b);
  const tempo =
    duracoes.length === 0
      ? null
      : String(
          Math.round(
            duracoes.length % 2 === 1
              ? duracoes[Math.floor(duracoes.length / 2)]!
              : (duracoes[duracoes.length / 2 - 1]! + duracoes[duracoes.length / 2]!) / 2,
          ),
        );

  return {
    referenciaRotta: rota.id,
    nome: rota.nome,
    // A Rotta não cadastra barco: toda rota é rodoviária. No dia em que
    // cadastrar, este é o ponto que muda.
    tipo: SETE_TIPO_ROTA.RODOVIARIA,
    ...turnosDaRota(rota.turno, rota.horariosDasParadas),
    hora_ida_inicio: horaIdaInicio,
    hora_ida_termino: horaIdaTermino,
    hora_volta_inicio: horaVoltaInicio,
    hora_volta_termino: horaVoltaTermino,
    km,
    tempo,
    da_porteira: simNao(rota.acessoPorteira),
    da_mataburro: simNao(rota.acessoMataBurro),
    da_colchete: simNao(rota.acessoColchete),
    da_atoleiro: simNao(rota.acessoAtoleiro),
    da_ponterustica: simNao(rota.acessoPonteRustica),
    shape: montarShape(rota.posicoesDaViagemMaisRecente),
  };
}

export type TipoVeiculoDaRotta =
  "AUTOMOVEL" | "SEDAN" | "SUV" | "MINIVAN" | "VAN" | "MICRO_ONIBUS" | "ONIBUS" | "OUTRO";

/**
 * Tipo de veículo da Rotta → tipo do SETE.
 *
 * O SETE foi desenhado para transporte escolar rural: a lista dele vai
 * de ônibus a canoa a remo, e não tem "automóvel", "sedan" nem "SUV".
 * Esses três e `OUTRO` viram `null` e entram em pendência, em vez de
 * virarem VAN por aproximação — a capacidade declarada ao FNDE mudaria,
 * e capacidade é o que o CTB art. 137 proíbe exceder.
 */
export function toSeteTipoVeiculo(tipo: TipoVeiculoDaRotta): SeteTipoVeiculo | null {
  const tabela: Partial<Record<TipoVeiculoDaRotta, SeteTipoVeiculo>> = {
    VAN: SETE_TIPO_VEICULO.VAN,
    MINIVAN: SETE_TIPO_VEICULO.VAN,
    MICRO_ONIBUS: SETE_TIPO_VEICULO.MICRO_ONIBUS,
    ONIBUS: SETE_TIPO_VEICULO.ONIBUS,
  };
  return tabela[tipo] ?? null;
}

export interface VeiculoDaRotta {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string;
  ano: number | null;
  renavam: string | null;
  capacidadePassageiros: number;
  tipo: TipoVeiculoDaRotta;
  origemFrota: "PROPRIO_MUNICIPIO" | "TERCEIRIZADO" | null;
  quilometragemAtual: number;
  status: string;
}

export function toSeteVeiculo(veiculo: VeiculoDaRotta): SeteVeiculo {
  return {
    referenciaRotta: veiculo.id,
    placa: veiculo.placa,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    ano: veiculo.ano,
    renavam: veiculo.renavam,
    capacidade: veiculo.capacidadePassageiros,
    tipo: toSeteTipoVeiculo(veiculo.tipo),
    // A Rotta não cadastra embarcação; todo veículo é rodoviário.
    modo: SETE_MODO_VEICULO.RODOVIARIO,
    origem:
      veiculo.origemFrota === null
        ? null
        : veiculo.origemFrota === "PROPRIO_MUNICIPIO"
          ? SETE_ORIGEM_VEICULO.PROPRIO
          : SETE_ORIGEM_VEICULO.TERCEIRIZADO,
    km_atual: veiculo.quilometragemAtual,
    manutencao: simNao(veiculo.status === "EM_MANUTENCAO"),
  };
}

export interface PessoaDaRotta {
  cpf: string;
  nome: string;
  telefone: string | null;
  /** Turnos das rotas em que a pessoa está escalada. */
  turnosEscalados: TurnoDaRotta[];
}

export interface MotoristaDaRotta extends PessoaDaRotta {
  /** CNH mais recente não excluída, ou `null`. */
  cnh: { numero: string; categoria: string | null; vencimentoEm: Date | null } | null;
  /** Só a EXISTÊNCIA do documento. O arquivo nunca sai daqui. */
  temAntecedentesCriminais: boolean;
}

/** Os três campos de turno de uma pessoa, a partir das rotas dela. */
function turnosDaPessoa(turnos: TurnoDaRotta[]): {
  turno_manha: SeteSimNao;
  turno_tarde: SeteSimNao;
  turno_noite: SeteSimNao;
} {
  const tem = (...quais: TurnoDaRotta[]): boolean => turnos.some((t) => quais.includes(t));
  return {
    turno_manha: simNao(tem("MANHA", "INTEGRAL")),
    turno_tarde: simNao(tem("TARDE", "INTEGRAL")),
    turno_noite: simNao(tem("NOITE")),
  };
}

const soData = (data: Date): string => data.toISOString().slice(0, 10);

export function toSeteMotorista(motorista: MotoristaDaRotta): SeteMotorista {
  // A categoria vem como "D", "AD", "ADE"... Cada letra acende um campo.
  const categorias = (motorista.cnh?.categoria ?? "").toUpperCase();
  const temCategoria = (letra: string): SeteSimNao => simNao(categorias.includes(letra));

  return {
    cpf: motorista.cpf,
    nome: motorista.nome,
    telefone: motorista.telefone,
    cnh: motorista.cnh?.numero ?? null,
    data_validade_cnh: motorista.cnh?.vencimentoEm ? soData(motorista.cnh.vencimentoEm) : null,
    tem_cnh_a: temCategoria("A"),
    tem_cnh_b: temCategoria("B"),
    tem_cnh_c: temCategoria("C"),
    tem_cnh_d: temCategoria("D"),
    tem_cnh_e: temCategoria("E"),
    ant_criminais: simNao(motorista.temAntecedentesCriminais),
    ...turnosDaPessoa(motorista.turnosEscalados),
    // RN-SETE-13: decisão de 10/11/2026 de não coletar.
    data_nascimento: null,
    sexo: null,
  };
}

export function toSeteMonitor(monitor: PessoaDaRotta): SeteMonitor {
  return {
    cpf: monitor.cpf,
    nome: monitor.nome,
    telefone: monitor.telefone,
    ...turnosDaPessoa(monitor.turnosEscalados),
    data_nascimento: null,
  };
}

export type TipoDeEscola =
  "CRECHE" | "PRE_ESCOLA" | "FUNDAMENTAL" | "MEDIO" | "EJA" | "TECNICO" | "UNIVERSIDADE" | "OUTRO";

/**
 * Nível de ensino do aluno, no código do SETE.
 *
 * Preferência pelo que a ESCOLA declara: se ela atende um nível só, é
 * esse, e não há o que inferir. Com mais de um, cai para a idade, que é
 * heurística declarada — a Rotta não guarda a série do aluno, e inventar
 * série a partir de idade erraria com todo repetente e todo adiantado.
 *
 * Sem data de nascimento utilizável, devolve `null` e o aluno vira
 * pendência. O `/importacao` do SETE recusa `nivel` vazio, então essa
 * pendência é bloqueante para o CSV — e está dito no LEIA-ME.
 */
export function nivelDoAluno(
  tiposDaEscola: TipoDeEscola[],
  dataNascimento: Date | null,
  hoje: Date = new Date(),
): SeteNivel | null {
  const porTipo: Record<TipoDeEscola, SeteNivel> = {
    CRECHE: SETE_NIVEL.INFANTIL,
    PRE_ESCOLA: SETE_NIVEL.INFANTIL,
    FUNDAMENTAL: SETE_NIVEL.FUNDAMENTAL,
    MEDIO: SETE_NIVEL.MEDIO,
    UNIVERSIDADE: SETE_NIVEL.SUPERIOR,
    EJA: SETE_NIVEL.OUTRO,
    TECNICO: SETE_NIVEL.OUTRO,
    OUTRO: SETE_NIVEL.OUTRO,
  };

  const niveisDaEscola = new Set(tiposDaEscola.map((t) => porTipo[t]));
  if (niveisDaEscola.size === 1) return [...niveisDaEscola][0]!;

  if (!dataNascimento) return null;
  const anos = Math.floor((hoje.getTime() - dataNascimento.getTime()) / (365.2425 * 86_400_000));
  if (anos < 0 || anos > 120) return null;
  if (anos <= 5) return SETE_NIVEL.INFANTIL;
  if (anos <= 14) return SETE_NIVEL.FUNDAMENTAL;
  if (anos <= 17) return SETE_NIVEL.MEDIO;
  return SETE_NIVEL.OUTRO;
}

export interface AlunoDaRotta {
  id: string;
  nome: string;
  dataNascimento: Date;
  sexo: "MASCULINO" | "FEMININO" | "OUTRO";
  turno: TurnoDaRotta;
  tiposDaEscola: TipoDeEscola[];
  embarqueLogradouro: string | null;
  embarqueNumero: string | null;
  embarqueBairro: string | null;
  embarqueCep: string | null;
  embarqueLatitude: number | null;
  embarqueLongitude: number | null;
  nomeDoResponsavel: string | null;
  telefoneDoResponsavel: string | null;
  /** A rota do aluno atravessa alguma condição de zona rural? */
  rotaTemAcessoRural: boolean;
}

/**
 * Turno do aluno, no código do SETE.
 *
 * `PERSONALIZADO` não existe lá. Vira `INTEGRAL`, que é o valor que o
 * SETE usa para "mais de um turno" — é o que um horário personalizado
 * significa na prática, e é a leitura menos errada disponível. Está
 * registrado como derivação, não como fato.
 */
export function toSeteTurnoDoAluno(turno: TurnoDaRotta): SeteTurno {
  const tabela: Record<TurnoDaRotta, SeteTurno> = {
    MANHA: SETE_TURNO.MATUTINO,
    TARDE: SETE_TURNO.VESPERTINO,
    INTEGRAL: SETE_TURNO.INTEGRAL,
    NOITE: SETE_TURNO.NOTURNO,
    PERSONALIZADO: SETE_TURNO.INTEGRAL,
  };
  return tabela[turno];
}

export function toSeteAluno(aluno: AlunoDaRotta, hoje: Date = new Date()): SeteAluno {
  const endereco = [aluno.embarqueLogradouro, aluno.embarqueNumero, aluno.embarqueBairro]
    .filter((parte): parte is string => Boolean(parte))
    .join(", ");

  return {
    referenciaRotta: aluno.id,
    nome: aluno.nome,
    data_nascimento: soData(aluno.dataNascimento),
    sexo:
      aluno.sexo === "MASCULINO"
        ? SETE_SEXO.MASCULINO
        : aluno.sexo === "FEMININO"
          ? SETE_SEXO.FEMININO
          : SETE_SEXO.NAO_INFORMADO,
    // SEMPRE "não informada". Cor/raça é dado sensível (LGPD art. 11)
    // de criança (art. 14): a Rotta não coleta e não repassa. O campo
    // existe porque o /importacao do SETE o exige, e `0` é a declaração
    // de ausência que ele mesmo define. Ver RN-SETE-04.
    cor: SETE_COR_RACA.NAO_INFORMADA,
    turno: toSeteTurnoDoAluno(aluno.turno),
    nivel: nivelDoAluno(aluno.tiposDaEscola, aluno.dataNascimento, hoje),
    mec_tp_localizacao: aluno.rotaTemAcessoRural ? SETE_LOCALIZACAO.RURAL : SETE_LOCALIZACAO.URBANA,
    loc_endereco: endereco || null,
    loc_cep: aluno.embarqueCep,
    loc_latitude: aluno.embarqueLatitude === null ? null : String(aluno.embarqueLatitude),
    loc_longitude: aluno.embarqueLongitude === null ? null : String(aluno.embarqueLongitude),
    nome_responsavel: aluno.nomeDoResponsavel,
    telefone_responsavel: aluno.telefoneDoResponsavel,
    // A Rotta não guarda o grau de parentesco. Pendência conhecida.
    grau_responsavel: null,
  };
}
