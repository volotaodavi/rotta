import type { Role } from "@rotta/api-client";
import type { Route } from "next";

/**
 * "Para onde ir depois de autenticar" — mesma decisão em TODO lugar que
 * precisa dela (login, resgate de convite): Responsável tem "Meus
 * Alunos" como home; Motorista/Monitor FUNCIONÁRIO de uma empresa
 * (`role` "motorista"/"monitor" — nunca "empresa", esse é o dono
 * autônomo/MEI, que tem seu próprio fluxo via `useAppMode`) só tem uma
 * função de verdade no painel: rodar a rota — manda direto pra "Minha
 * Rota" (`/minha-rota`), não pro painel de gestão que ele nem enxerga
 * no menu (`(dashboard)/layout.tsx`). Qualquer outro papel profissional
 * (Empresa, Gestor, Escola) continua indo pra "Minha Empresa".
 *
 * Extraído porque antes desta função cada tela reimplementava esse
 * `if` (e uma delas — resgate de convite — nem tratava Motorista/
 * Monitor, mandando todo mundo pra `/empresa` sem checar o papel).
 */
export function defaultRouteForRole(role: Role): Route {
  if (role === "responsavel") return "/alunos";
  if (role === "motorista" || role === "monitor") return "/minha-rota";
  return "/empresa";
}
