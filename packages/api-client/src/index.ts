/**
 * @rotta/api-client — cliente de API tipado da Rotta (Dossie 22, Secao 5.6).
 *
 * `endpoints/` recebera um arquivo por modulo de dominio (ex.
 * `endpoints/trips.ts`, espelhando o Dossie 13), cada um exportando
 * funcoes tipadas (ex. `startTrip(routeId)`) construidas sobre `http.ts` —
 * a implementar junto com cada modulo de backend real.
 */

export * from "./endpoints/agenda";
export * from "./endpoints/analytics";
export * from "./endpoints/auth";
export * from "./endpoints/backoffice";
export * from "./endpoints/billing";
export * from "./endpoints/companies";
export * from "./endpoints/company-join-requests";
export * from "./endpoints/dashboard";
export * from "./endpoints/drivers";
export * from "./endpoints/geo";
export * from "./endpoints/gps";
export * from "./endpoints/health";
export * from "./endpoints/identity-verification";
export * from "./endpoints/legal-documents";
export * from "./endpoints/marketplace";
export * from "./endpoints/notifications";
export * from "./endpoints/routes";
export * from "./endpoints/schools";
export * from "./endpoints/student-pre-registrations";
export * from "./endpoints/students";
export * from "./endpoints/support";
export * from "./endpoints/trips";
export * from "./endpoints/vehicles";
export * from "./endpoints/wallet";
export * from "./http";
