"use client";

import { Bug } from "@rotta/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Select,
  TableSkeleton,
  Typography,
} from "@rotta/ui/web";
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

const SOURCE_LABEL: Record<string, string> = {
  "error-boundary": "Error Boundary",
  "window-error": "window.onerror",
  unhandledrejection: "Promise rejeitada",
};

/**
 * ACHADO REAL (21 ocorrências reais investigadas manualmente antes desta
 * tela ganhar isso — ver `apps/web/src/lib/chunk-load-error.ts`): um erro
 * REAL de app, redigido pelo Next.js em produção, sempre ganha um
 * `digest` — é assim que a Vercel correlaciona com o log do servidor. A
 * ausência de `digest` na mesma frase genérica de "Server Components
 * render" é a assinatura de um navegador rodando um bundle/cache
 * desatualizado (ver `isStaleClientRenderError`), não um bug de
 * componente de verdade. Esse diagnóstico já existia na cabeça de quem
 * investigava manualmente — agora fica na própria tela, calculado uma
 * vez por linha, sem precisar reabrir esta investigação a cada relato novo.
 */
const GENERIC_RSC_MESSAGE = /error occurred in the server components render/i;

function diagnose(report: ClientErrorReport): { label: string; variant: BadgeVariant } | null {
  if (!report.digest && GENERIC_RSC_MESSAGE.test(report.message)) {
    return { label: "Bundle desatualizado no navegador", variant: "warning" };
  }
  if (report.digest) {
    return { label: "Erro de app real (com digest)", variant: "danger" };
  }
  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

/** Uma ocorrência — mensagem + digest sempre visíveis, stack atrás de um "Ver stack" (pode ser longa). */
function ReportRow({ report }: { report: ClientErrorReport }): JSX.Element {
  const [showStack, setShowStack] = useState(false);
  const diagnosis = diagnose(report);

  return (
    <div className="flex flex-col gap-2 px-6 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={APP_BADGE_VARIANT[report.app]}>{APP_LABEL[report.app]}</Badge>
        {diagnosis && <Badge variant={diagnosis.variant}>{diagnosis.label}</Badge>}
        {report.serviceWorkerActive && <Badge variant="warning">Service Worker ativo</Badge>}
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
        {report.source && (
          <Typography variant="caption" color="muted">
            · origem: {SOURCE_LABEL[report.source] ?? report.source}
          </Typography>
        )}
      </div>

      <Typography variant="body" className="font-semibold break-words">
        {report.message}
      </Typography>

      <Typography variant="caption" color="muted">
        {report.userNome ? `Usuário: ${report.userNome}` : "Usuário: não identificado (sem login)"}
        {report.companyNome ? ` · Empresa: ${report.companyNome}` : ""}
        {report.buildId ? ` · Build: ${report.buildId}` : ""}
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
  const [buildId, setBuildId] = useState("");
  const pageSize = 20;

  const { data, isLoading, isError, refetch, isFetching } = useClientErrorReportsList({
    app: app || undefined,
    buildId: buildId || undefined,
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

      <div className="flex flex-wrap items-center gap-3">
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
        <Input
          className="w-full max-w-[260px]"
          placeholder="Filtrar por build (ex: a1b2c3d)"
          value={buildId}
          onChange={(event) => {
            setBuildId(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        {isLoading ? (
          <Card.Body>
            <TableSkeleton columns={3} className="border-none" />
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
            <EmptyState
              icon={Bug}
              title={`Nenhum erro reportado até agora${app ? ` para ${APP_LABEL[app]}` : ""}.`}
            />
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
