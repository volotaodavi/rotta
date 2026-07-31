/**
 * @rotta/validators — schemas Zod compartilhados entre frontend
 * (validacao de formulario, `@rotta/forms`) e backend (`apps/api`,
 * validacao de payload de entrada) — Dossie 22, Secao 5.5.
 *
 * A mesma regra (ex. "CPF precisa ter digito verificador valido",
 * Dossie 15 `AUTH-01`) e escrita uma unica vez aqui e usada nos dois
 * lados, eliminando o risco de front e back validarem de forma
 * sutilmente diferente.
 *
 *   schemas/   Um arquivo por dominio (ex. `aluno.schema.ts`), a criar
 *              junto com o primeiro modulo de negocio implementado.
 */

export {};
