import type { DriverDocument } from "@prisma/client";

/**
 * Motor de elegibilidade para TRANSPORTE ESCOLAR (Dossiê 45 —
 * PROMPT DE COMPLEMENTAÇÃO "ROTTA LEGAL & TRUST CENTER" §6/§18-§20).
 *
 * Regra central que este arquivo aplica, sem exceção: a categoria da
 * CNH e a modalidade de transporte são informações SEPARADAS — nunca
 * `CNH D/E = apto`, nunca `CNH B + EAR = transporte escolar`. Só
 * `ELIGIBLE` quando TODOS os requisitos configurados (categoria D/E +
 * EAR + curso especializado + antecedentes criminais) estiverem
 * presentes, aprovados/sem pendência de análise, e dentro da validade —
 * qualquer requisito faltando, reprovado, vencido ou perto de vencer
 * derruba o resultado, nunca "quase elegível" arredondado para cima.
 *
 * Puro (sem I/O) de propósito — recebe os `DriverDocument`s já
 * carregados (mais recente de cada tipo, não deletado) e devolve o
 * veredito; quem busca os documentos (`DriversService`, já com RBAC/
 * RLS aplicados) fica de fora deste arquivo para que a regra de negócio
 * seja testável sem mock de banco/HTTP.
 */
export type SchoolTransportEligibilityStatus =
  "PENDING" | "UNDER_REVIEW" | "ELIGIBLE" | "NOT_ELIGIBLE" | "EXPIRED" | "REQUIRES_UPDATE";

export interface SchoolTransportEligibilityResult {
  status: SchoolTransportEligibilityStatus;
  motivo: string;
  /** Categoria da CNH encontrada (documento mais recente), null se nenhuma CNH cadastrada — nunca usado como modalidade, só exibido para transparência. */
  categoriaCnh: string | null;
  requisitosVerificados: {
    cnhCategoriaValida: boolean;
    ear: boolean;
    cursoTransporteEscolar: boolean;
    antecedentesCriminais: boolean;
  };
}

/** Categorias de CNH que a Rotta considera candidatas a transporte escolar — nunca `B` sozinha (Dossiê 45). */
const CATEGORIAS_ELEGIVEIS = new Set(["D", "E"]);

/** Documentos exigidos ALÉM da CNH para a modalidade transporte escolar — lista única, reaproveitada tanto para achar o que falta quanto para checar vencimento/análise. */
const REQUISITOS_ADICIONAIS = [
  "EAR",
  "CURSO_TRANSPORTE_ESCOLAR",
  "ANTECEDENTES_CRIMINAIS",
] as const;

/** Documento vencendo dentro desse prazo já não é mais tratado como `ELIGIBLE` puro — mesmo horizonte de `listExpiringSoon`/`NotificationType.CNH_VENCENDO` usado no resto do módulo. */
const DIAS_ALERTA_VENCIMENTO = 30;

function latestByTipo(documents: DriverDocument[]): Map<string, DriverDocument> {
  const map = new Map<string, DriverDocument>();
  // `documents` já vem ordenado por createdAt desc (ver `PrismaDriverDocumentRepository.listByUser`)
  // — a primeira ocorrência de cada tipo é a mais recente.
  for (const doc of documents) {
    if (!map.has(doc.tipo)) {
      map.set(doc.tipo, doc);
    }
  }
  return map;
}

function isVencido(doc: DriverDocument, now: Date): boolean {
  return Boolean(doc.vencimentoEm && doc.vencimentoEm.getTime() < now.getTime());
}

function isVencendoEmBreve(doc: DriverDocument, now: Date): boolean {
  if (!doc.vencimentoEm) return false;
  const limite = doc.vencimentoEm.getTime() - now.getTime();
  return limite >= 0 && limite <= DIAS_ALERTA_VENCIMENTO * 24 * 60 * 60 * 1000;
}

export function computeSchoolTransportEligibility(
  documents: DriverDocument[],
  now: Date = new Date(),
): SchoolTransportEligibilityResult {
  const porTipo = latestByTipo(documents);
  const cnh = porTipo.get("CNH");
  const categoriaCnh = cnh?.categoria?.toUpperCase().trim() ?? null;

  const requisitosVerificados = {
    cnhCategoriaValida: categoriaCnh !== null && CATEGORIAS_ELEGIVEIS.has(categoriaCnh),
    ear: porTipo.has("EAR"),
    cursoTransporteEscolar: porTipo.has("CURSO_TRANSPORTE_ESCOLAR"),
    antecedentesCriminais: porTipo.has("ANTECEDENTES_CRIMINAIS"),
  };

  if (!cnh) {
    return {
      status: "PENDING",
      motivo: "Nenhuma CNH cadastrada ainda.",
      categoriaCnh: null,
      requisitosVerificados,
    };
  }

  if (!requisitosVerificados.cnhCategoriaValida) {
    return {
      status: "NOT_ELIGIBLE",
      motivo: `Categoria da CNH (${categoriaCnh ?? "não informada"}) não é elegível para transporte escolar — a Rotta trabalha com categorias D e E para essa modalidade, considerando também os demais requisitos aplicáveis.`,
      categoriaCnh,
      requisitosVerificados,
    };
  }

  const faltando = REQUISITOS_ADICIONAIS.filter((tipo) => !porTipo.has(tipo));
  if (faltando.length > 0) {
    return {
      status: "PENDING",
      motivo: `Aguardando envio: ${faltando.join(", ")}.`,
      categoriaCnh,
      requisitosVerificados,
    };
  }

  const documentosRelevantes = [cnh, ...REQUISITOS_ADICIONAIS.map((tipo) => porTipo.get(tipo)!)];

  const vencidos = documentosRelevantes.filter((doc) => isVencido(doc, now));
  if (vencidos.length > 0) {
    return {
      status: "EXPIRED",
      motivo: `Documento(s) vencido(s): ${vencidos.map((d) => d.tipo).join(", ")}.`,
      categoriaCnh,
      requisitosVerificados,
    };
  }

  const reprovados = documentosRelevantes.filter((doc) => doc.rottaAiStatus === "REPROVADO");
  if (reprovados.length > 0) {
    return {
      status: "NOT_ELIGIBLE",
      motivo: `Documento(s) reprovado(s) na análise: ${reprovados.map((d) => d.tipo).join(", ")}.`,
      categoriaCnh,
      requisitosVerificados,
    };
  }

  const emAnalise = documentosRelevantes.filter((doc) => doc.rottaAiStatus === "PENDENTE");
  if (emAnalise.length > 0) {
    return {
      status: "UNDER_REVIEW",
      motivo: `Documento(s) ainda em análise: ${emAnalise.map((d) => d.tipo).join(", ")}.`,
      categoriaCnh,
      requisitosVerificados,
    };
  }

  const vencendoEmBreve = documentosRelevantes.filter((doc) => isVencendoEmBreve(doc, now));
  if (vencendoEmBreve.length > 0) {
    return {
      status: "REQUIRES_UPDATE",
      motivo: `Documento(s) vencendo nos próximos ${DIAS_ALERTA_VENCIMENTO} dias: ${vencendoEmBreve.map((d) => d.tipo).join(", ")}.`,
      categoriaCnh,
      requisitosVerificados,
    };
  }

  return {
    status: "ELIGIBLE",
    motivo:
      "Todos os requisitos aplicáveis para transporte escolar estão verificados (categoria D/E, EAR, curso especializado e antecedentes criminais).",
    categoriaCnh,
    requisitosVerificados,
  };
}
