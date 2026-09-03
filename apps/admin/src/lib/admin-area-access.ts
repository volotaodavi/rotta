import type { AdminRottaPapel } from "@rotta/api-client";
import type { Route } from "next";

/**
 * Espelha `AREAS_BY_PAPEL` de `apps/api/src/common/guards/admin-area.guard.ts`
 * (pedido do usuário 03/09/2026: "crie outros acessos... com
 * particularidades") — controla SÓ o que aparece/é navegável no
 * painel; a autorização de verdade continua no backend
 * (`AdminAreaGuard`), este arquivo nunca é a única barreira. Prefixos
 * de rota, não áreas do backend 1:1 — `/veiculos/mapa` por exemplo
 * também é "veículos" pro SUPORTE.
 */
const SUPORTE_ROUTE_PREFIXES: Route[] = ["/suporte", "/verificacao-identidade", "/veiculos"];
const FINANCEIRO_ROUTE_PREFIXES: Route[] = ["/financeiro"];

function matchesAnyPrefix(pathname: string, prefixes: Route[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** `undefined`/`"GERAL"` sempre pode tudo — só SUPORTE/FINANCEIRO são restritos. */
export function isAdminRouteAllowed(papel: AdminRottaPapel | undefined, pathname: string): boolean {
  if (!papel || papel === "GERAL") return true;
  if (papel === "SUPORTE") return matchesAnyPrefix(pathname, SUPORTE_ROUTE_PREFIXES);
  return matchesAnyPrefix(pathname, FINANCEIRO_ROUTE_PREFIXES);
}

/** Pra onde mandar um sub-papel restrito ao entrar — `/` (Painel geral) não é uma opção pra eles. */
export function defaultRouteForAdminPapel(papel: AdminRottaPapel | undefined): Route {
  if (papel === "SUPORTE") return "/suporte";
  if (papel === "FINANCEIRO") return "/financeiro";
  return "/";
}
