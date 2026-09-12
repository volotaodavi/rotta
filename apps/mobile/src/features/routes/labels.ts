import type { StatusPillTone } from "@/features/vehicles/components";
import type { RouteStatus, RouteWeekday } from "@rotta/api-client";

/**
 * Rótulos/tons de Rotas no app (Frente 4, Empresa/Gestor reduzida) —
 * mirror exato de `apps/web/src/features/routes/labels.ts`
 * (`ROUTE_WEEKDAY_LABEL`/`ROUTE_STATUS_LABEL`/`ROUTE_STATUS_VARIANT`),
 * só trocando `BadgeVariant` (web) por `StatusPillTone` (mobile) — os
 * nomes de tom já batem 1:1 (`success`/`neutral`).
 */
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

export const ROUTE_STATUS_TONE: Record<RouteStatus, StatusPillTone> = {
  ATIVA: "success",
  PAUSADA: "neutral",
};

/**
 * Mesma proteção documentada na Web (achado real: `.slice()` direto em
 * cima de `ROUTE_WEEKDAY_LABEL[dia]` lançava `TypeError` não tratado se
 * `dia` não batesse exatamente com uma das 7 chaves do enum) — um dia
 * sem label conhecida vira `"?"` em vez de derrubar a tela inteira.
 */
export function formatRouteWeekdaysAbbrev(diasSemana: readonly RouteWeekday[]): string {
  return diasSemana.map((dia) => (ROUTE_WEEKDAY_LABEL[dia] ?? "?").slice(0, 3)).join(", ");
}
