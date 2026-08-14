/**
 * Formato (parcial, tolerante) do payload de decisão da Didit (`GET
 * /v3/session/{id}/decision/`, o mesmo `decisao` já persistido — ver
 * `IdentityVerificationService`) — confirmado via a documentação
 * pública da Didit (docs.didit.me): `liveness.reference_image` (URL
 * assinada da selfie capturada), `face_match.source_image`/
 * `target_image` (selfie vs. foto do documento) e os `score` (0-100)
 * de cada verificação.
 *
 * Nunca um tipo estrito — a Didit adiciona seções conforme o
 * `workflow_id` da sessão (nem toda verificação tem `face_match`, por
 * exemplo), e o objetivo aqui é só dar nome a CAMPOS JÁ CONHECIDOS pra
 * renderizar bonito; qualquer coisa fora disso continua disponível no
 * payload bruto (`decisao` completo, mostrado abaixo do card de
 * evidências na tela de detalhe).
 */
export interface DiditWarning {
  short_description?: string;
  long_description?: string;
}

export interface DiditLivenessSection {
  status?: string;
  /** "PASSIVE" | "FLASHING" | "ACTIVE_3D". */
  method?: string;
  /** 0-100. */
  score?: number;
  /** URL assinada (temporária) da selfie capturada durante a prova de vida. */
  reference_image?: string;
  /** Só presente pros métodos FLASHING/ACTIVE_3D. */
  video_url?: string;
  warnings?: DiditWarning[];
}

export interface DiditFaceMatchSection {
  status?: string;
  /** Similaridade 0-100. */
  score?: number;
  /** Selfie capturada na hora. */
  source_image?: string;
  /** Foto extraída do documento de identidade. */
  target_image?: string;
  warnings?: DiditWarning[];
}

export interface DiditIdVerificationSection {
  status?: string;
  document_type?: string;
  warnings?: DiditWarning[];
}

export interface DiditReview {
  comment?: string;
  user?: string;
  created_at?: string;
}

export interface DiditDecision {
  status?: string;
  liveness?: DiditLivenessSection;
  face_match?: DiditFaceMatchSection;
  id_verification?: DiditIdVerificationSection;
  reviews?: DiditReview[];
  [key: string]: unknown;
}

/** `decisao` chega como `unknown` (Prisma `Json`) — narrowing tolerante, nunca lança. */
export function parseDiditDecision(raw: unknown): DiditDecision | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as DiditDecision;
}
