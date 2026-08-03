import type { StatusPillTone } from "../vehicles/components/status-pill";
import type {
  SchoolAccessPointType,
  SchoolAdministrativeDependency,
  SchoolShift,
  SchoolStatus,
  SchoolType,
} from "@rotta/api-client";

export const SCHOOL_TYPE_LABEL: Record<SchoolType, string> = {
  CRECHE: "Creche",
  PRE_ESCOLA: "Pré-escola",
  FUNDAMENTAL: "Ensino Fundamental",
  MEDIO: "Ensino Médio",
  EJA: "EJA",
  TECNICO: "Técnico",
  UNIVERSIDADE: "Universidade",
  OUTRO: "Outro",
};

export const SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL: Record<
  SchoolAdministrativeDependency,
  string
> = {
  FEDERAL: "Federal",
  ESTADUAL: "Estadual",
  MUNICIPAL: "Municipal",
  PRIVADA: "Privada",
  FILANTROPICA: "Filantrópica",
  COMUNITARIA: "Comunitária",
};

export const SCHOOL_SHIFT_LABEL: Record<SchoolShift, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
  INTEGRAL: "Integral",
  NOITE: "Noite",
  PERSONALIZADO: "Personalizado",
};

export const SCHOOL_ACCESS_POINT_TYPE_LABEL: Record<SchoolAccessPointType, string> = {
  ENTRADA_PRINCIPAL: "Entrada principal",
  PONTO_EMBARQUE: "Ponto de embarque",
  PONTO_DESEMBARQUE: "Ponto de desembarque",
  OUTRO: "Outro",
};

export const SCHOOL_STATUS_LABEL: Record<SchoolStatus, string> = {
  ATIVA: "Ativa",
  INATIVA: "Inativa",
  EM_ANALISE: "Em análise",
  ARQUIVADA: "Arquivada",
};

export const SCHOOL_STATUS_TONE: Record<SchoolStatus, StatusPillTone> = {
  ATIVA: "success",
  INATIVA: "neutral",
  EM_ANALISE: "warning",
  ARQUIVADA: "danger",
};
