import type { StatusPillTone } from "@/features/vehicles/components";
import type {
  CompanyJoinPreRegistrationStatus,
  IdentityVerificationStatus,
  StudentPreRegistrationStatus,
} from "@rotta/api-client";

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

/**
 * Equipe (Frente 5) — mesmos textos/tons de
 * `apps/web/src/app/(dashboard)/equipe/page.tsx`.
 */
export const IDENTITY_VERIFICATION_STATUS_LABEL: Record<IdentityVerificationStatus, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  EXPIRADA: "Expirada",
};

export const IDENTITY_VERIFICATION_STATUS_TONE: Record<IdentityVerificationStatus, StatusPillTone> =
  {
    NAO_INICIADA: "neutral",
    EM_ANDAMENTO: "info",
    EM_ANALISE: "warning",
    APROVADA: "success",
    REPROVADA: "danger",
    EXPIRADA: "danger",
  };

/** Papel dentro da equipe — `Role` inclui outros valores (empresa/responsavel/admin_rotta), mas só estes 3 aparecem numa equipe. */
export const PAPEL_LABEL: Record<string, string> = {
  motorista: "Motorista",
  monitor: "Monitor",
  gestor: "Gestor",
};

export const COMPANY_JOIN_PRE_REGISTRATION_STATUS_LABEL: Record<
  CompanyJoinPreRegistrationStatus,
  string
> = {
  PENDENTE: "Aguardando vínculo",
  VINCULADO: "Vinculado",
  CANCELADO: "Cancelado",
};

export const COMPANY_JOIN_PRE_REGISTRATION_STATUS_TONE: Record<
  CompanyJoinPreRegistrationStatus,
  StatusPillTone
> = {
  PENDENTE: "neutral",
  VINCULADO: "success",
  CANCELADO: "danger",
};
