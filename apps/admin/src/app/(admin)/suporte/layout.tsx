"use client";

import { Headset, Search } from "@rotta/icons";
import { EmptyState, ErrorState, Spinner } from "@rotta/ui/web";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import type { SupportTicketStatus } from "@rotta/api-client";

import { ChatAvatar } from "@/features/support/components/chat-avatar";
import { SupportTicketStatusBadge } from "@/features/support/components/support-ticket-status-badge";
import { useSupportTickets } from "@/features/support/hooks/use-support";
import { formatRelativeChatTime } from "@/lib/relative-time";

const STATUS_TABS: { value: SupportTicketStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_ANDAMENTO", label: "Andamento" },
  { value: "ENCERRADO", label: "Encerrado" },
];

/**
 * Central de Atendimento — layout estilo WhatsApp (pedido do usuário
 * 03/09/2026: "quero o layout IGUAL do WhatsApp, para podermos
 * entender e conversar"). Lista de conversas SEMPRE visível à
 * esquerda (como a barra de chats do WhatsApp Web); a conversa
 * selecionada renderiza à direita via `{children}` — `/suporte`
 * (estado vazio) ou `/suporte/[id]` (chat aberto). Mesmos dados/
 * endpoints de sempre (`SupportService`), só a interface é nova.
 *
 * `-m-6`/`h-[calc(100vh-108px)]` cancelam o padding padrão de
 * `(admin)/layout.tsx#main` só nesta rota — as outras telas do painel
 * continuam com scroll de página normal; só o chat precisa de duas
 * colunas com scroll independente, mesmo comportamento do WhatsApp.
 */
export default function SuporteLayout({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const activeId = pathname?.startsWith("/suporte/") ? pathname.split("/")[2] : undefined;

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<SupportTicketStatus | "">("");
  const [arquivado, setArquivado] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useSupportTickets({
    page: 1,
    pageSize: 100,
    status: status || undefined,
    arquivado,
  });

  const conversas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const items = data?.items ?? [];
    if (!termo) return items;
    return items.filter(
      (ticket) =>
        ticket.assunto.toLowerCase().includes(termo) ||
        ticket.companyNome.toLowerCase().includes(termo) ||
        ticket.abertoPorNome.toLowerCase().includes(termo) ||
        (ticket.protocolo?.toLowerCase().includes(termo) ?? false),
    );
  }, [data, busca]);

  return (
    <div className="-m-6 flex h-[calc(100vh-108px)] min-h-[520px] overflow-hidden border-t border-border">
      {/* Coluna esquerda — lista de conversas, sempre visível (mesmo papel da barra de chats do WhatsApp Web). */}
      <aside className="flex w-full max-w-sm shrink-0 flex-col border-r border-border bg-surface sm:w-80">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <h1 className="text-lg font-bold text-text">Central de Atendimento</h1>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Search size={16} className="shrink-0 text-text-muted" />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar conversa"
              className="w-full bg-transparent text-sm text-text placeholder:text-placeholder outline-none"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  status === tab.value
                    ? "bg-primary text-white"
                    : "bg-muted text-text-muted hover:text-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={() => setArquivado((current) => !current)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                arquivado ? "bg-primary text-white" : "bg-muted text-text-muted hover:text-text"
              }`}
            >
              Arquivados
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <div className="p-4">
              <ErrorState
                message="Não foi possível carregar as conversas."
                onRetry={() => void refetch()}
                isRetrying={isFetching}
              />
            </div>
          ) : conversas.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Headset}
                title={
                  busca
                    ? "Nenhuma conversa encontrada."
                    : arquivado
                      ? "Nenhum chamado arquivado."
                      : "Nenhum chamado registrado ainda."
                }
              />
            </div>
          ) : (
            <ul>
              {conversas.map((ticket) => {
                const isActive = ticket.id === activeId;
                return (
                  <li key={ticket.id}>
                    <Link
                      href={`/suporte/${ticket.id}?companyId=${ticket.companyId}`}
                      className={`flex items-start gap-3 border-b border-border/60 px-4 py-3 transition-colors ${
                        isActive ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <ChatAvatar nome={ticket.companyNome} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-text">
                            {ticket.companyNome}
                          </span>
                          <span className="shrink-0 text-[11px] text-text-muted">
                            {formatRelativeChatTime(ticket.createdAt)}
                          </span>
                        </div>
                        <span className="truncate text-xs text-text-muted">{ticket.assunto}</span>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="truncate text-xs text-text-muted">
                            {ticket.abertoPorNome}
                          </span>
                          <SupportTicketStatusBadge status={ticket.status} />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Coluna direita — a conversa em si (`/suporte` = nada selecionado; `/suporte/[id]` = chat aberto). */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">{children}</div>
    </div>
  );
}
