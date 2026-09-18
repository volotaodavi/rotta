/**
 * Política de retenção do rastro bruto de GPS.
 *
 * Origem (18/09/2026): ao responder "tudo de forma gratuita?" para o
 * plano de correções da auditoria, uma busca por limpeza de dados não
 * encontrou NENHUMA — `TripPosition` nunca era apagada. Com escrita a
 * cada 15 segundos por motorista em viagem
 * (`use-trip-gps-reporting.ts`), a conta fecha assim:
 *
 *     4 posições/min × 60 min de rota  =    240 linhas/dia por motorista
 *     × 22 dias úteis                  =  5.280 linhas/mês por motorista
 *     × 10 motoristas × 12 meses       = 633.600 linhas/ano
 *
 * Com 50 motoristas passa de 3 milhões de linhas por ano, para sempre.
 * Isso estoura qualquer Postgres de plano gratuito — e aconteceria mesmo
 * sem nenhuma das outras correções.
 *
 * O que se apaga aqui é só o rastro BRUTO — o ponto a cada 15 segundos.
 * O que dá valor ao histórico continua intacto para sempre: a própria
 * `Trip` (início, fim, status, motorista, veículo) e os
 * `TripStudentEvent` (quem embarcou e desembarcou, onde e quando) — que
 * é o que uma família de fato pergunta meses depois.
 */

/**
 * Idade a partir da qual uma posição deixa de ter valor operacional.
 *
 * 90 dias cobre com folga o uso real: conferir um trajeto de ontem,
 * investigar uma reclamação da semana passada, revisar o mês fechado.
 * Ninguém abre o mapa de um trajeto de quatro meses atrás ponto a ponto.
 */
export const RETENCAO_POSICOES_DIAS = 90;

/**
 * Quantas linhas apagar por rodada.
 *
 * Um `DELETE` sem limite na primeira execução tentaria apagar tudo que
 * foi acumulado desde sempre numa transação só — trava a tabela, estoura
 * o tempo do job e pode derrubar a API justamente por causa da limpeza
 * que deveria protegê-la. Em lotes, a primeira execução leva alguns dias
 * para drenar o passivo e nenhuma rodada individual machuca.
 */
export const LOTE_DE_EXCLUSAO = 5_000;

/** Quantos lotes no máximo por execução do job. */
export const LOTES_POR_EXECUCAO = 10;
