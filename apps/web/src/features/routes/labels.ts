import type { RouteStatus, RouteWeekday } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

export const ROUTE_WEEKDAY_LABEL: Record<RouteWeekday, string> = {
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  ATIVA: "Ativa",
  PAUSADA: "Pausada",
};

export const ROUTE_STATUS_VARIANT: Record<RouteStatus, BadgeVariant> = {
  ATIVA: "success",
  PAUSADA: "neutral",
};

/**
 * Achado real de uma sessão anterior (bug "Não foi possível carregar
 * esta página" — erro de Server Components render nunca totalmente
 * explicado, mensagem redigida pelo Next.js em produção): uma versão
 * anterior deste util encadeava `.slice()` direto no resultado de
 * `ROUTE_WEEKDAY_LABEL[dia]` — se `dia` não bater exatamente com uma
 * das 7 chaves do enum (registro legado, valor gravado por uma versão
 * antiga do backend, corrupção de dado), isso indexa `undefined` e
 * `.slice()` lança um `TypeError` não tratado durante a própria
 * renderização da página, exatamente a classe de erro por trás desse
 * "algo deu errado". Frente 7 (prevenção de riscos, vazamentos e
 * erros) do fluxo novo de Rotas: esta função nunca lança — um dia sem
 * label conhecida vira `"?"` em vez de derrubar a tela inteira.
 */
export function formatRouteWeekdaysAbbrev(diasSemana: readonly RouteWeekday[]): string {
  return diasSemana.map((dia) => (ROUTE_WEEKDAY_LABEL[dia] ?? "?").slice(0, 3)).join(", ");
}
