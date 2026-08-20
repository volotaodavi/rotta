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
 * Achado real investigando "Não foi possível carregar esta página" ao
 * abrir uma rota (erro de Server Components render, mensagem redigida
 * pelo Next.js em produção — sem stack visível pro usuário nem acesso
 * a log da Vercel neste ambiente). `ROUTE_WEEKDAY_LABEL[dia]` é seguro
 * (indexação simples: devolve `undefined` pra uma chave fora do enum,
 * nunca lança), mas `route.diasSemana.map((dia) =>
 * ROUTE_WEEKDAY_LABEL[dia].slice(0, 3))` encadeava `.slice()` direto no
 * resultado — se QUALQUER valor em `diasSemana` não bater exatamente
 * com uma das 7 chaves do enum (registro legado, valor gravado por uma
 * versão antiga do backend, corrupção de dado), `.slice()` em
 * `undefined` lança um `TypeError` não tratado durante a própria
 * renderização da página — exatamente a classe de erro que produz esse
 * "Server Components render error" em produção, e que nenhuma
 * reprodução local reproduziu (toda rota criada nos testes usava
 * valores válidos do enum atual). Esta função nunca lança: um dia sem
 * label conhecida vira `"?"` em vez de derrubar a tela inteira.
 */
export function formatRouteWeekdaysAbbrev(diasSemana: readonly RouteWeekday[]): string {
  return diasSemana.map((dia) => (ROUTE_WEEKDAY_LABEL[dia] ?? "?").slice(0, 3)).join(", ");
}
