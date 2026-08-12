import type { IdentityVerificationStatus } from "@prisma/client";

/**
 * Traduz o `status` literal da Didit (docs.didit.me/integration/
 * verification-statuses) para o enum interno da Rotta — ver comentário
 * de `IdentityVerificationStatus` no schema Prisma para o mapeamento
 * completo. Desconhecido/ausente vira `NAO_INICIADA` (nunca lança — um
 * evento/status novo que a Didit venha a adicionar não pode derrubar o
 * webhook nem a sincronização manual do Admin Rotta).
 *
 * Compartilhado entre `DiditWebhookController` (push) e
 * `IdentityVerificationService` (pull, `GET /v3/session/{id}/decision/`)
 * — as duas fontes usam exatamente os mesmos literais de status.
 */
export function mapDiditStatus(status: string | undefined): IdentityVerificationStatus {
  switch (status) {
    case "In Progress":
    case "Awaiting User":
    case "Resubmitted":
      return "EM_ANDAMENTO";
    case "In Review":
      return "EM_ANALISE";
    case "Approved":
      return "APROVADA";
    case "Declined":
      return "REPROVADA";
    case "Expired":
    case "Kyc Expired":
      return "EXPIRADA";
    default:
      return "NAO_INICIADA";
  }
}

/** Texto usado quando o status é REPROVADA mas nada em `extractDiditDecisionReason` achou um motivo aproveitável — nunca deixa o campo em branco pro usuário reprovado, mas também nunca inventa um motivo específico que a Didit não informou. */
export const DEFAULT_REJECTION_REASON =
  "Verificação recusada pela Didit, sem motivo detalhado informado pelo revisor.";

/**
 * Extrai um motivo legível do payload de decisão da Didit (`event.decision`
 * no webhook, ou o corpo de `GET /v3/session/{id}/decision/` no pull) —
 * "stub honesto": nunca inventa um motivo plausível, só relata o que a
 * própria Didit escreveu. Devolve `null` quando não há nada usável (quem
 * chama decide o texto de fallback, ex. `DEFAULT_REJECTION_REASON`).
 *
 * Onde a Didit normalmente deixa o motivo de uma reprovação/revisão:
 * - `reviews[].comment` — comentário de quem revisou manualmente no
 *   Business Console (é o texto que o revisor escreveu ao recusar/pedir
 *   reenvio) — a fonte mais confiável, sempre priorizada.
 * - `<verificação>.warnings[].long_description`/`.short_description` —
 *   avisos automáticos por tipo de verificação (ex. `id_verification.
 *   warnings`, `face_match.warnings`), quando não há revisão manual.
 */
export function extractDiditDecisionReason(
  decision: Record<string, unknown> | null | undefined,
): string | null {
  if (!decision) return null;

  const reviewComments = collectReviewComments(decision.reviews);
  if (reviewComments.length > 0) return reviewComments.join(" | ");

  const warningDescriptions = VERIFICATION_SECTION_KEYS.flatMap((key) =>
    collectWarningDescriptions(decision[key]),
  );
  if (warningDescriptions.length > 0) {
    return Array.from(new Set(warningDescriptions)).join(" | ");
  }

  return null;
}

/** Chaves de verificação por tipo que a Didit pode incluir na decisão — nem toda sessão tem todas (depende do `workflow_id`), por isso a checagem é tolerante a ausência. */
const VERIFICATION_SECTION_KEYS = [
  "id_verification",
  "nfc",
  "face_match",
  "liveness",
  "aml",
  "ip_analysis",
  "document_verification",
  "biometric_verification",
  "age_estimation",
  "proof_of_address",
  "phone_verification",
] as const;

function collectReviewComments(reviews: unknown): string[] {
  if (!Array.isArray(reviews)) return [];
  const comments: string[] = [];
  for (const review of reviews) {
    if (!review || typeof review !== "object") continue;
    const comment = (review as Record<string, unknown>).comment;
    if (typeof comment === "string" && comment.trim()) {
      comments.push(comment.trim());
    }
  }
  return comments;
}

function collectWarningDescriptions(section: unknown): string[] {
  if (!section || typeof section !== "object") return [];
  const warnings = (section as Record<string, unknown>).warnings;
  if (!Array.isArray(warnings)) return [];

  const descriptions: string[] = [];
  for (const warning of warnings) {
    if (!warning || typeof warning !== "object") continue;
    const record = warning as Record<string, unknown>;
    const description = record.long_description ?? record.short_description;
    if (typeof description === "string" && description.trim()) {
      descriptions.push(description.trim());
    }
  }
  return descriptions;
}
