/**
 * @rotta/shared-contracts — fonte unica de verdade dos contratos de
 * dominio da Rotta (Dossie 22, Secao 6.3).
 *
 * Define, em schemas Zod (validacao em runtime + tipos estaticos via
 * inferencia), a forma de cada DTO de API (Dossie 13) e de cada evento
 * de dominio (Dossie 14, Secao 4). `packages/types` e
 * `packages/validators` re-exportam a partir daqui para o frontend;
 * `apps/api` consome os mesmos schemas diretamente para validacao de
 * entrada — o dia em que um campo muda, a build de todo consumidor
 * desatualizado quebra no mesmo Pull Request, antes de chegar a
 * producao (Dossie 22, Secao 6.3).
 *
 *   entities/   Schemas que espelham as entidades do Dossie 8
 *   dtos/       Schemas de request/response de cada endpoint do Dossie 13
 *   events/     Schemas dos eventos de dominio do Dossie 14, Secao 4
 *
 * Nenhum contrato definido ainda (fase de fundacao) — o primeiro a ser
 * criado deve acompanhar o primeiro modulo de dominio real implementado
 * (recomendacao: `auth`, Dossie 15).
 */

export {};
