import type { StatusPillTone } from "./components/status-pill";
import type {
  VehicleCategory,
  VehicleDocumentAiStatus,
  VehicleDocumentType,
  VehicleMaintenanceType,
  VehicleOccurrenceSeverity,
  VehicleStatus,
  VehicleType,
} from "@rotta/api-client";

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  DISPONIVEL: "Disponível",
  EM_VIAGEM: "Em viagem",
  MANUTENCAO: "Manutenção",
  RESERVA: "Reserva",
  INATIVO: "Inativo",
  BLOQUEADO: "Bloqueado",
};

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

/**
 * Modalidade de uso do veículo (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE
 * ESCOLAR) — reaproveitado pelo Marketplace (`features/marketplace`)
 * para mostrar ao Responsável a modalidade real da frota de uma
 * transportadora, nunca inferida da categoria da CNH de um motorista.
 * Fonte única: nenhum outro arquivo redeclara este rótulo.
 */
export const VEHICLE_CATEGORY_LABEL: Record<VehicleCategory, string> = {
  ESCOLAR: "Transporte escolar",
  FRETAMENTO: "Fretamento",
  PARTICULAR: "Particular",
  OUTRO: "Outro",
};

export const VEHICLE_CATEGORY_TONE: Record<VehicleCategory, StatusPillTone> = {
  ESCOLAR: "success",
  FRETAMENTO: "info",
  PARTICULAR: "neutral",
  OUTRO: "neutral",
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

export const VEHICLE_OCCURRENCE_SEVERITY_LABEL: Record<VehicleOccurrenceSeverity, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

export const VEHICLE_OCCURRENCE_SEVERITY_TONE: Record<VehicleOccurrenceSeverity, StatusPillTone> = {
  BAIXA: "info",
  MEDIA: "warning",
  ALTA: "danger",
};

export const VEHICLE_STATUS_TONE: Record<VehicleStatus, StatusPillTone> = {
  DISPONIVEL: "success",
  EM_VIAGEM: "info",
  MANUTENCAO: "warning",
  RESERVA: "neutral",
  INATIVO: "neutral",
  BLOQUEADO: "danger",
};

export const VEHICLE_DOCUMENT_AI_STATUS_LABEL: Record<VehicleDocumentAiStatus, string> = {
  PENDENTE: "Análise pendente",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  INDISPONIVEL: "IA indisponível",
};

export const VEHICLE_DOCUMENT_AI_STATUS_TONE: Record<VehicleDocumentAiStatus, StatusPillTone> = {
  PENDENTE: "info",
  APROVADO: "success",
  REPROVADO: "danger",
  INDISPONIVEL: "neutral",
};
