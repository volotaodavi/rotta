"use client";

import { Badge, Button, Card, ErrorState, Select, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { ClientApp, ClientErrorReport } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import { useClientErrorReportsList } from "@/features/client-errors/hooks/use-client-errors";

const APP_LABEL: Record<ClientApp, string> = {
  WEB: "Painel Web",
  ADMIN: "Admin Rotta",
  MOBILE: "App Mobile",
};

const APP_BADGE_VARIANT: Record<ClientApp, BadgeVariant> = {
  WEB: "info",
  ADMIN: "warning",
  MOBILE: "success",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

/** Uma ocorrência — mensagem + digest sempre visíveis, stack atrás de um "Ver stack" (pode ser longa). */
function ReportRow({ report }: { report: ClientErrorReport }): JSX.Element {
  const [showStack, setShowStack] = useState(false);

  return (
    <div className="flex flex-col gap-2 px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={APP_BADGE_VARIANT[report.app]}>{APP_LABEL[report.app]}</Badge>
        <Typography variant="caption" color="muted">
          {formatDate(report.createdAt)}
        </Typography>
        <Typography variant="caption" color="muted">
          · {report.path}
        </Typography>
        {report.digest && (
          <Typography variant="caption" color="muted" className="font-mono">
            · digest {report.digest}
          </Typography>
        )}
      </div>

      <Typography variant="body" className="font-semibold break-words">
        {report.message}
      </Typography>

      <Typography variant="caption" color="muted">
        {report.userNome ? `Usuário: ${report.userNome}` : "Usuário: não identificado (sem login)"}
        {report.companyNome ? ` · Empresa: ${report.companyNome}` : ""}
      </Typography>

      {report.stack && (
        <div>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setShowStack((current) => !current)}
          >
            {showStack ? "Ocultar stack" : "Ver stack"}
          </button>
          {showStack && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-surface-muted p-3 text-xs text-text-muted">
              {report.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Fila de erros reais capturados do cliente (Frente 1 — captura de erro
 * real do cliente, `POST /client-errors` em `apps/web`/`apps/admin`
 * `error.tsx`). Existe porque em produção (Vercel) o Next.js redige a
 * mensagem original de todo erro de "Server Components render" antes de
 * o navegador recebê-la — sem esta tela, a única forma de saber o que
 * quebrou de verdade era vasculhar o dashboard da Vercel manualmente.
 * `digest` aqui é o mesmo valor opaco que aparece pro usuário na tela de
 * erro — é a chave pra cruzar "o usuário viu isso" com "foi isto que
 * quebrou".
 */
export default function ErrosClientePage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [app, setApp] = useState<ClientApp | "">("");
  const pageSize = 20;

  const { data, isLoading, isError, refetch, isFetching } = useClientErrorReportsList({
    app: app || undefined,
    page,
    pageSize,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Erros do cliente</Typography>
        <Typography variant="bodySmall" color="muted">
          Mensagem, digest e stack reais reportados pelo navegador antes de o Next.js os redigir em
          produção — o jeito de descobrir o que quebrou sem depender do dashboard da Vercel.
        </Typography>
      </div>

      <div className="flex items-center gap-3">
        <Select
          className="w-full max-w-[220px]"
          value={app}
          onChange={(event) => {
            setApp(event.target.value as ClientApp | "");
            setPage(1);
          }}
        >
          <option value="">Todos os apps</option>
          <option value="WEB">Painel Web</option>
          <option value="ADMIN">Admin Rotta</option>
          <option value="MOBILE">App Mobile</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <ErrorState
              message="Não foi possível carregar os erros do cliente."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </Card.Body>
        ) : data && data.items.length === 0 ? (
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhum erro reportado até agora{app ? ` para ${APP_LABEL[app]}` : ""}.
            </Typography>
          </Card.Body>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((report) => (
              <ReportRow key={report.id} report={report} />
            ))}
          </div>
        )}
      </Card>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between">
          <Typography variant="caption" color="muted">
            Página {data.page} de {Math.ceil(data.total / data.pageSize)} · {data.total} erros
          </Typography>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              isDisabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isDisabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
