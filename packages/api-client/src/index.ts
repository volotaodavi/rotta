/**
 * @rotta/api-client — cliente de API tipado da Rotta (Dossie 22, Secao 5.6).
 *
 * `endpoints/` recebera um arquivo por modulo de dominio (ex.
 * `endpoints/trips.ts`, espelhando o Dossie 13), cada um exportando
 * funcoes tipadas (ex. `startTrip(routeId)`) construidas sobre `http.ts` —
 * a implementar junto com cada modulo de backend real.
 */

export * from "./endpoints/auth";
export * from "./endpoints/companies";
export * from "./endpoints/geo";
export * from "./endpoints/marketplace";
export * from "./endpoints/schools";
export * from "./endpoints/students";
export * from "./endpoints/vehicles";
export * from "./http";
