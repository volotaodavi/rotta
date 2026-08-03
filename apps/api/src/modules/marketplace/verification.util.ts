import type { Vehicle, VehicleDocument, VehicleDocumentType } from "@prisma/client";

/**
 * Documentos obrigatórios para um veículo contar como "em dia" no
 * cálculo do selo (briefing "ROTTA AI" do módulo Veículos define estes
 * quatro como os documentos formais do veículo; `LAUDO`/`FOTO`/`OUTRO`
 * ficam de fora por serem complementares/opcionais).
 */
const REQUIRED_DOCUMENT_TYPES: VehicleDocumentType[] = [
  "CRLV",
  "LICENCIAMENTO",
  "SEGURO",
  "VISTORIA",
];

function vehicleIsRegular(vehicle: Vehicle & { documentos: VehicleDocument[] }): boolean {
  const hasAnyRejected = vehicle.documentos.some((doc) => doc.rottaAiStatus === "REPROVADO");
  if (hasAnyRejected) return false;

  const now = new Date();
  return REQUIRED_DOCUMENT_TYPES.every((tipo) => {
    const doc = vehicle.documentos.find((d) => d.tipo === tipo);
    if (!doc) return false;
    if (doc.rottaAiStatus !== "APROVADO") return false;
    return !doc.vencimentoEm || doc.vencimentoEm > now;
  });
}

/**
 * Selo "Transportador Verificado" (briefing "ROTTA AI" do módulo
 * Marketplace) — SEMPRE calculado a partir de dados reais já
 * persistidos, nunca um valor setável diretamente pela Empresa: `true`
 * somente quando (1) a Empresa está `ATIVO`, (2) tem ao menos 1 veículo
 * ativo, e (3) TODOS os veículos ativos têm os 4 documentos obrigatórios
 * aprovados (`rottaAiStatus = APROVADO`) e não vencidos, sem nenhum
 * documento reprovado. Como `RottaAiService.analyzeVehicleDocument` é um
 * stub que sempre lança (Dossiê 15), `rottaAiStatus` nunca chega a
 * `APROVADO` por análise automática hoje — na prática o selo só aparece
 * quando um humano (Admin Rotta, revisão manual) tiver marcado os
 * documentos como aprovados por fora; o dia em que a Rotta AI real
 * existir, o selo passa a refletir a aprovação automática sem qualquer
 * mudança neste cálculo.
 */
export function computeVerified(
  companyStatus: string,
  vehicles: (Vehicle & { documentos: VehicleDocument[] })[],
): boolean {
  if (companyStatus !== "ATIVO") return false;
  if (vehicles.length === 0) return false;
  return vehicles.every(vehicleIsRegular);
}
