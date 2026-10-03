/**
 * A escala da diretoria de agentes, como a tela do Admin mostra.
 *
 * A fonte de verdade de como os agentes se comportam é `empresa/` no
 * repositório (`CALENDARIO.md`, `cargos/*.md`), e quem dispara os
 * turnos são as Routines agendadas no servidor da Anthropic. Este
 * arquivo é a mesma informação em TypeScript, para a tela poder dizer
 * "hoje é dia do CTO" e "hoje é feriado, ninguém trabalha" sem
 * depender de rede.
 *
 * Quando a escala mudar, os dois lados mudam: aqui e em
 * `empresa/CALENDARIO.md`. É duplicação consciente, e pequena: cinco
 * linhas de turno e uma lista de feriados por ano.
 */

export interface TurnoDaEscala {
  /** 1 = segunda, 5 = sexta (mesma convenção de `date +%u`). */
  diaDaSemana: number;
  cargo: "CEO" | "CTO" | "CMO" | "CFO";
  /** Horário de Brasília, como está no agendamento. */
  hora: string;
  entrega: string;
}

export const ESCALA: TurnoDaEscala[] = [
  {
    diaDaSemana: 1,
    cargo: "CEO",
    hora: "09:07",
    entrega: "A semana organizada, com a prioridade de cada cargo",
  },
  {
    diaDaSemana: 2,
    cargo: "CTO",
    hora: "09:11",
    entrega: "Conserto ou melhoria no produto, com teste",
  },
  {
    diaDaSemana: 3,
    cargo: "CMO",
    hora: "09:13",
    entrega: "Texto das páginas públicas, material ou análise de funil",
  },
  {
    diaDaSemana: 4,
    cargo: "CTO",
    hora: "09:11",
    entrega: "Conserto ou melhoria no produto, com teste",
  },
  {
    diaDaSemana: 5,
    cargo: "CFO",
    hora: "09:09",
    entrega: "Análise com número medido na fonte",
  },
];

export const JANELA = { inicio: "09:00", limite: "18:00" } as const;

/**
 * Feriados nacionais, no mesmo formato de `empresa/CALENDARIO.md`
 * (ISO, para comparar sem ambiguidade). Carnaval e Corpus Christi são
 * ponto facultativo e entram do mesmo jeito: o país para.
 */
export const FERIADOS: Record<string, string> = {
  "2026-01-01": "Confraternização Universal",
  "2026-02-16": "Carnaval",
  "2026-02-17": "Carnaval",
  "2026-04-03": "Sexta-feira Santa",
  "2026-04-21": "Tiradentes",
  "2026-05-01": "Dia do Trabalho",
  "2026-06-04": "Corpus Christi",
  "2026-09-07": "Independência",
  "2026-10-12": "Nossa Senhora Aparecida",
  "2026-11-02": "Finados",
  "2026-11-15": "Proclamação da República",
  "2026-11-20": "Consciência Negra",
  "2026-12-25": "Natal",
  "2027-01-01": "Confraternização Universal",
  "2027-02-08": "Carnaval",
  "2027-02-09": "Carnaval",
  "2027-03-26": "Sexta-feira Santa",
  "2027-04-21": "Tiradentes",
  "2027-05-01": "Dia do Trabalho",
  "2027-05-27": "Corpus Christi",
  "2027-09-07": "Independência",
  "2027-10-12": "Nossa Senhora Aparecida",
  "2027-11-02": "Finados",
  "2027-11-15": "Proclamação da República",
  "2027-11-20": "Consciência Negra",
  "2027-12-25": "Natal",
};

/**
 * Data e dia da semana em Brasília, não no fuso de quem está olhando.
 * Um admin acessando de fora do Brasil (ou com o relógio do sistema em
 * outro fuso) veria o dia errado se isso usasse o fuso local: a escala
 * é de Brasília porque é lá que os agendamentos estão.
 */
export function hojeEmBrasilia(agora = new Date()): { iso: string; diaDaSemana: number } {
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const partes = formatador.formatToParts(agora);
  const pegar = (tipo: string): string => partes.find((parte) => parte.type === tipo)?.value ?? "";
  const iso = `${pegar("year")}-${pegar("month")}-${pegar("day")}`;
  const DIAS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  return { iso, diaDaSemana: DIAS[pegar("weekday")] ?? 0 };
}

export interface SituacaoDeHoje {
  iso: string;
  diaDaSemana: number;
  /** `null` quando hoje não é dia de turno. */
  turno: TurnoDaEscala | null;
  /** Nome do feriado, quando hoje for feriado nacional. */
  feriado: string | null;
  /** Por que ninguém trabalha hoje, em linguagem de tela. */
  motivoDeFolga: string | null;
}

export function situacaoDeHoje(agora = new Date()): SituacaoDeHoje {
  const { iso, diaDaSemana } = hojeEmBrasilia(agora);
  const feriado = FERIADOS[iso] ?? null;
  const fimDeSemana = diaDaSemana === 6 || diaDaSemana === 7;
  const turno = ESCALA.find((item) => item.diaDaSemana === diaDaSemana) ?? null;

  return {
    iso,
    diaDaSemana,
    turno: feriado || fimDeSemana ? null : turno,
    feriado,
    motivoDeFolga: feriado
      ? `Feriado nacional: ${feriado}`
      : fimDeSemana
        ? "Fim de semana: a companhia não trabalha"
        : null,
  };
}

/** O próximo turno a partir de hoje, pulando fim de semana e feriado. */
export function proximoTurno(agora = new Date()): { turno: TurnoDaEscala; emDias: number } | null {
  for (let adiante = 1; adiante <= 14; adiante += 1) {
    const data = new Date(agora.getTime() + adiante * 86_400_000);
    const situacao = situacaoDeHoje(data);
    if (situacao.turno) return { turno: situacao.turno, emDias: adiante };
  }
  return null;
}
