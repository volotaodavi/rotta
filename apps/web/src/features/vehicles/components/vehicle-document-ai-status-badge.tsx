import { Badge, type BadgeVariant } from "@rotta/ui/web";

import type { VehicleDocumentAiStatus } from "@rotta/api-client";

/**
 * Rótulos/cores da análise Rotta AI (Frentes E/G — formato/resolução +
 * OCR real via Tesseract.js) sobre um `VehicleDocument`. Nunca traduzir
 * `APROVADO` como "documento válido" — é só "legível e com os campos
 * esperados", NUNCA autenticidade/adulteração (ver
 * `VehicleDocumentAnalysisResponseDto`, `analiseCompleta` sempre
 * `false`).
 */
export const VEHICLE_DOCUMENT_AI_STATUS_LABEL: Record<VehicleDocumentAiStatus, string> = {
  PENDENTE: "Analisando…",
  APROVADO: "Legível e completo",
  REPROVADO: "Problema na imagem",
  INDISPONIVEL: "Análise indisponível",
};

const STATUS_VARIANT: Record<VehicleDocumentAiStatus, BadgeVariant> = {
  PENDENTE: "neutral",
  APROVADO: "success",
  REPROVADO: "danger",
  INDISPONIVEL: "neutral",
};

export function VehicleDocumentAiStatusBadge({
  status,
}: {
  status: VehicleDocumentAiStatus;
}): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status]}>{VEHICLE_DOCUMENT_AI_STATUS_LABEL[status]}</Badge>;
}
