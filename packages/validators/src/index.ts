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
 *   schemas/   Um arquivo por dominio de validacao.
 */

export * from "./schemas/cep.schema";
export * from "./schemas/document.schema";
export * from "./schemas/email.schema";
export * from "./schemas/password.schema";
export * from "./schemas/phone.schema";
export * from "./schemas/plate.schema";
