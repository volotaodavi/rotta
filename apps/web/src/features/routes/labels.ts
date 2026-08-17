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
