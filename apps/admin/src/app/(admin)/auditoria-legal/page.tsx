"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "@rotta/icons";
import { Badge, Card, Typography } from "@rotta/ui/web";
import { useMemo, useState } from "react";

import type { AuditItemStatus } from "@/features/legal-audit/checklist-data";

import { AUDIT_CHECKLIST } from "@/features/legal-audit/checklist-data";

const STATUS_LABEL: Record<AuditItemStatus, string> = {
  CONSISTENTE: "Consistente",
  PARCIAL: "Parcial",
  DIVERGENTE: "Divergente",
};

const STATUS_BADGE: Record<AuditItemStatus, "success" | "warning" | "danger"> = {
  CONSISTENTE: "success",
  PARCIAL: "warning",
  DIVERGENTE: "danger",
};

const STATUS_ICON: Record<AuditItemStatus, typeof CheckCircle2> = {
  CONSISTENTE: CheckCircle2,
  PARCIAL: AlertTriangle,
  DIVERGENTE: XCircle,
};

const FILTERS: { label: string; value: AuditItemStatus | "TODOS" }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Consistente", value: "CONSISTENTE" },
  { label: "Parcial", value: "PARCIAL" },
  { label: "Divergente", value: "DIVERGENTE" },
];

/**
 * FRENTE 6 — Auditoria de Consistência Legal ↔ Produto (Dossiê 45,
 * tarefa #206). Checklist CURADA (não automatizada — decisão do
 * próprio escopo da tarefa): cada linha em `checklist-data.ts` foi
 * conferida manualmente, documento legal real contra código real do
 * módulo citado em "evidência". Automatizar essa comparação (rodar em
 * CI, detectar quando um dos dois lados muda) é um passo futuro de
 * infraestrutura de teste — v1 é sobre ter o cruzamento existindo e
 * visível para quem administra a Rotta, não sobre alarme automático.
 */
export default function AuditoriaLegalPage(): JSX.Element {
  const [filtro, setFiltro] = useState<AuditItemStatus | "TODOS">("TODOS");

  const itensFiltrados = useMemo(
    () =>
      filtro === "TODOS" ? AUDIT_CHECKLIST : AUDIT_CHECKLIST.filter((i) => i.status === filtro),
    [filtro],
  );

  const contagem = useMemo(() => {
    const base: Record<AuditItemStatus, number> = { CONSISTENTE: 0, PARCIAL: 0, DIVERGENTE: 0 };
    for (const item of AUDIT_CHECKLIST) base[item.status] += 1;
    return base;
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Auditoria de Consistência Legal ↔ Produto</Typography>
        <Typography variant="bodySmall" color="muted">
          O que a Documentação Rotta promete, cruzado com o comportamento real do código — checklist
          curada manualmente, não gerada automaticamente.
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["CONSISTENTE", "PARCIAL", "DIVERGENTE"] as const).map((status) => {
          const Icon = STATUS_ICON[status];
          return (
            <Card key={status}>
              <Card.Body className="flex items-center justify-between gap-3">
                <div>
                  <Typography variant="caption" color="muted">
                    {STATUS_LABEL[status]}
                  </Typography>
                  <Typography variant="title">{contagem[status]}</Typography>
                </div>
                <Badge variant={STATUS_BADGE[status]}>
                  <Icon size={12} className="mr-1 inline" />
                  {STATUS_LABEL[status]}
                </Badge>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFiltro(item.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              filtro === item.value
                ? "border-primary bg-primary text-white"
                : "border-border text-text-muted hover:text-text"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {itensFiltrados.map((item) => {
          const Icon = STATUS_ICON[item.status];
          return (
            <Card key={item.id}>
              <Card.Body className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Typography variant="caption" color="muted">
                      {item.area}
                    </Typography>
                    <Typography variant="subtitle">{item.documentoTitulo}</Typography>
                    <Typography variant="caption" color="muted" className="font-mono">
                      {item.documentoCaminho}
                    </Typography>
                  </div>
                  <Badge variant={STATUS_BADGE[item.status]}>
                    <Icon size={12} className="mr-1 inline" />
                    {STATUS_LABEL[item.status]}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Typography variant="caption" className="font-semibold text-text-muted">
                      O documento promete
                    </Typography>
                    <Typography variant="bodySmall">{item.alegacaoLegal}</Typography>
                  </div>
                  <div>
                    <Typography variant="caption" className="font-semibold text-text-muted">
                      O que o código faz
                    </Typography>
                    <Typography variant="bodySmall">{item.comportamentoReal}</Typography>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                  <Typography variant="caption" color="muted" className="font-mono">
                    {item.evidencia}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    Revisado em {new Date(item.ultimaRevisao).toLocaleDateString("pt-BR")}
                  </Typography>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
