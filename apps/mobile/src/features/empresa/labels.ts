import type { StatusPillTone } from "@/features/vehicles/components";
import type { StudentPreRegistrationStatus } from "@rotta/api-client";

/**
 * Rótulos/tons de status da Empresa/Gestor no app — mesmos textos e
 * mesma paleta de tom já usados em `apps/web/src/app/(dashboard)/alunos-pre-cadastro/page.tsx`
 * (`STATUS_LABEL`/`STATUS_VARIANT`), só trocando `Badge` (web) por
 * `StatusPill` (mobile).
 */
export const STUDENT_PRE_REGISTRATION_STATUS_LABEL: Record<StudentPreRegistrationStatus, string> = {
  PENDENTE: "Aguardando o responsável",
  RECLAMADO: "Responsável já iniciou o cadastro",
  CONCLUIDO: "Cadastro concluído",
  CANCELADO: "Cancelado",
};

export const STUDENT_PRE_REGISTRATION_STATUS_TONE: Record<
  StudentPreRegistrationStatus,
  StatusPillTone
> = {
  PENDENTE: "neutral",
  RECLAMADO: "info",
  CONCLUIDO: "success",
  CANCELADO: "danger",
};
