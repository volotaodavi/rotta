"use client";

import { Badge, Card, Spinner, Typography } from "@rotta/ui/web";
import { useEffect, useState } from "react";

import { env } from "@/config/env";

interface ReadinessBody {
  status: "ok" | "degraded";
  database: boolean;
  cache: boolean;
}

type CheckState =
  { kind: "loading" } | { kind: "unreachable" } | { kind: "loaded"; body: ReadinessBody };

/**
 * Client component isolado de `page.tsx` (Server Component — precisa
 * exportar `metadata`) pelo mesmo motivo do `FaqAccordion`: um "use
 * client" não pode coexistir com `export const metadata` no mesmo
 * arquivo.
 */
export function StatusChecker(): JSX.Element {
  const [state, setState] = useState<CheckState>({ kind: "loading" });
  const [checadoEm, setCheckadoEm] = useState<Date | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function check(): Promise<void> {
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/health/ready`);
        const body = (await res.json()) as ReadinessBody;
        if (!cancelado) {
          setState({ kind: "loaded", body });
          setCheckadoEm(new Date());
        }
      } catch {
        if (!cancelado) {
          setState({ kind: "unreachable" });
          setCheckadoEm(new Date());
        }
      }
    }

    void check();
    // Repete a cada 30s enquanto a página estiver aberta — não é um
    // dashboard de monitoramento, só evita que o visitante precise
    // recarregar manualmente para ver uma mudança de status.
    const interval = setInterval(() => void check(), 30_000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <ServiceRow label="API" state={state} />
      <ServiceRow label="Banco de dados" state={state} field="database" />
      <ServiceRow label="Cache" state={state} field="cache" />
      {checadoEm && (
        <Typography variant="caption" className="text-text-muted">
          Última verificação: {checadoEm.toLocaleTimeString("pt-BR")}, atualiza automaticamente a
          cada 30s.
        </Typography>
      )}
    </Card>
  );
}

function ServiceRow({
  label,
  state,
  field,
}: {
  label: string;
  state: CheckState;
  field?: "database" | "cache";
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <Typography variant="body">{label}</Typography>
      <ServiceBadge state={state} field={field} />
    </div>
  );
}

function ServiceBadge({
  state,
  field,
}: {
  state: CheckState;
  field?: "database" | "cache";
}): JSX.Element {
  if (state.kind === "loading") {
    return <Spinner size="sm" />;
  }
  if (state.kind === "unreachable") {
    return <Badge variant="danger">Fora do ar</Badge>;
  }

  const ok = field ? state.body[field] : state.body.status === "ok";
  return ok ? (
    <Badge variant="success">Operacional</Badge>
  ) : (
    <Badge variant="warning">Degradado</Badge>
  );
}
