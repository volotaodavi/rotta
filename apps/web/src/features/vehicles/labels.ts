import type {
  VehicleCategory,
  VehicleDocumentType,
  VehicleMaintenanceType,
  VehicleReminderType,
  VehicleType,
} from "@rotta/api-client";

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

export const VEHICLE_DOCUMENT_TYPE_LABEL: Record<VehicleDocumentType, string> = {
  CRLV: "CRLV",
  LICENCIAMENTO: "Licenciamento",
  SEGURO: "Seguro",
  LAUDO: "Laudo",
  VISTORIA: "Vistoria",
  FOTO: "Foto",
  OUTRO: "Outro",
};

export const VEHICLE_MAINTENANCE_TYPE_LABEL: Record<VehicleMaintenanceType, string> = {
  TROCA_OLEO: "Troca de óleo",
  PNEUS: "Pneus",
  FREIOS: "Freios",
  REVISAO: "Revisão",
  VISTORIA: "Vistoria",
  LIMPEZA: "Limpeza",
  OUTRA: "Outra",
};

export const VEHICLE_REMINDER_TYPE_LABEL: Record<VehicleReminderType, string> = {
  LICENCIAMENTO: "Licenciamento",
  SEGURO: "Seguro",
  REVISAO: "Revisão",
  TROCA_OLEO: "Troca de óleo",
  MANUTENCAO_PREVENTIVA: "Manutenção preventiva",
  VISTORIA: "Vistoria",
};
