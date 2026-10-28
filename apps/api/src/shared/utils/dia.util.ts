/**
 * O fuso em que a operação acontece.
 *
 * Não é configurável aqui de propósito, e a razão está em quem chama:
 * o caminho do rastreador não tem ator nem requisição, só um IMEI, e
 * descobrir o fuso da empresa custaria uma consulta a mais em cada
 * posição recebida (uma a cada 30 segundos, por ônibus). `Company`
 * tem o campo `fusoHorario` para o dia em que a Rotta atender uma
 * cidade fora deste fuso; até lá, toda operação é brasileira e o
 * custo não se justifica.
 */
const FUSO_DA_OPERACAO = "America/Sao_Paulo";

/**
 * Início do dia corrente em UTC.
 *
 * ## Cuidado: isto quase nunca é o que se quer
 *
 * "Hoje em UTC" e "hoje para quem está dirigindo" são dias diferentes
 * durante três horas por noite no Brasil. Use `inicioDoDiaNaOperacao`
 * para qualquer pergunta sobre o dia de trabalho (escala, viagem,
 * chamada). Esta aqui só serve quando a pergunta é genuinamente sobre
 * UTC.
 *
 * NOTA DE DÍVIDA (22/09/2026): esta função já existia copiada dentro de
 * `trips.service.ts` e de `agenda.service.ts`. Escrevi aqui em vez de
 * fazer a TERCEIRA cópia — mesma lição do `ROT-07`, em que três cópias
 * de uma regra de ordenação de paradas viveram meses sem ninguém notar.
 * As duas cópias antigas continuam lá; migrá-las é trabalho separado e
 * merece o próprio commit.
 */
export function inicioDoDiaUtc(agora: Date = new Date()): Date {
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
}

/**
 * O dia de trabalho corrente, como `Trip.data` e `RouteAssignment.data`
 * o guardam: meia-noite UTC do dia CIVIL BRASILEIRO.
 *
 * ## O defeito que isto conserta
 *
 * O servidor roda em UTC, e o Brasil está três horas atrás. Entre 21h e
 * meia-noite de Brasília, `inicioDoDiaUtc()` já devolve AMANHÃ. Um
 * ônibus que liga a ignição às 21h30 procurava a escala do dia
 * seguinte, não achava nada, e a viagem não abria: para a família, o
 * ônibus simplesmente não existia. É a janela do transporte noturno,
 * exatamente o turno em que mais importa alguém estar vendo.
 *
 * ## Por que a volta é uma data em UTC, e não uma data local
 *
 * Porque `@db.Date` no Postgres guarda só o dia civil, e o Prisma o
 * entrega como meia-noite UTC. Devolver qualquer outra hora faria a
 * comparação errar por um dia em alguma borda. Então a conta é:
 * descobrir QUAL é o dia no relógio de parede brasileiro, e montar a
 * meia-noite UTC daquele dia.
 *
 * `en-CA` devolve `aaaa-mm-dd`, que é exatamente o formato que o
 * construtor de `Date` lê como dia civil.
 */
export function inicioDoDiaNaOperacao(agora: Date = new Date()): Date {
  const dia = agora.toLocaleDateString("en-CA", { timeZone: FUSO_DA_OPERACAO });
  return new Date(`${dia}T00:00:00.000Z`);
}
