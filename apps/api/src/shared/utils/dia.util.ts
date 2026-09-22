/**
 * Início do dia corrente em UTC.
 *
 * `Trip.data` é `@db.Date` (sem hora), então a hora local do servidor
 * nunca deve vazar para comparações de "hoje" — senão a mesma consulta
 * responde coisas diferentes dependendo de onde o container subiu.
 *
 * NOTA DE DÍVIDA (22/09/2026): esta função já existia copiada dentro de
 * `trips.service.ts` e de `agenda.service.ts`. Escrevi aqui em vez de
 * fazer a TERCEIRA cópia — mesma lição do `ROT-07`, em que três cópias
 * de uma regra de ordenação de paradas viveram meses sem ninguém notar.
 * As duas cópias antigas continuam lá; migrá-las é trabalho separado e
 * merece o próprio commit, para não misturar refatoração com o Portal
 * da Escola.
 */
export function inicioDoDiaUtc(agora: Date = new Date()): Date {
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
}
