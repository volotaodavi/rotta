import type { VehicleCategory, VehicleType } from "@rotta/api-client";

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
  PARTICULAR: "Particular",
  OUTRO: "Outro",
};
