import type { VehicleAdminReviewStatus, VehicleCategory, VehicleType } from "@rotta/api-client";

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  AUTOMOVEL: "Automóvel",
  SEDAN: "Sedan",
  SUV: "SUV",
  MINIVAN: "Minivan",
  VAN: "Van",
  MICRO_ONIBUS: "Micro-ônibus",
  ONIBUS: "Ônibus",
  OUTRO: "Outro",
};

export const VEHICLE_CATEGORY_LABEL: Record<VehicleCategory, string> = {
  ESCOLAR: "Escolar",
  FRETAMENTO: "Fretamento",
  EXECUTIVO: "Executivo",
  OUTRO: "Outro",
};

/** Epic A — camada ADICIONAL de aprovação do Admin Rotta, separada da revisão de categoria. */
export const VEHICLE_ADMIN_REVIEW_STATUS_LABEL: Record<VehicleAdminReviewStatus, string> = {
  PRE_APROVADO: "Pré-aprovado",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};
