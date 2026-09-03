"use client";

import { Archive, ArchiveRestore, CheckCircle2, Send, Sparkles } from "@rotta/icons";
import { Badge, Spinner, Typography } from "@rotta/ui/web";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ChatAvatar } from "@/features/support/components/chat-avatar";
import { SupportTicketStatusBadge } from "@/features/support/components/support-ticket-status-badge";
import {
  useAddSupportMessage,
  useArchiveSupportTicket,
  useCloseSupportTicket,
  useSupportTicketDetail,
  useUnarchiveSupportTicket,
} from "@/features/support/hooks/use-support";
import { formatRelativeChatTime } from "@/lib/relative-time";

/** Ícone-botão do cabeçalho — mesmo papel visual dos ícones de ação no topo de uma conversa do WhatsApp Web. */
function HeaderIconButton({
  label,
  isLoading,
  onClick,
  children,
}: {
  label: string;
  isLoading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={isLoading}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-muted hover:text-text disabled:opacity-50"
    >
      {isLoading ? <Spinner size="sm" /> : children}
    </button>
  );
}

/**
 * Conversa aberta (`SUP-02`, visão Admin Rotta) — layout estilo
 * WhatsApp (pedido do usuário 03/09/2026). Renderiza SÓ o painel
 * direito: a lista de conversas à esquerda vive em
 * `../layout.tsx`, sempre montada. `companyId` continua vindo da
 * query string (Admin Rotta não tem tenant próprio no token).
 */
export default function SuporteDetalhePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const companyId = useSearchParams().get("companyId") ?? undefined;
  const [mensagem, setMensagem] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading, isError } = useSupportTicketDetail(id, companyId);
  const addMessage = useAddSupportMessage(id, companyId);
  const closeTicket = useCloseSupportTicket(id, companyId);
  const archiveTicket = useArchiveSupportTicket(id, companyId);
  const unarchiveTicket = useUnarchiveSupportTicket(id, companyId);

  // Rola pro fim a cada troca de conversa/nova mensagem — mesmo
  // comportamento padrão de qualquer app de chat.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [ticket?.mensagens.length, id]);

  function enviar(): void {
    if (mensagem.trim().length === 0) return;
    addMessage.mutate(mensagem, { onSuccess: () => setMensagem("") });
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Typography variant="body" color="danger">
          Chamado não encontrado.
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho da conversa — mesmo papel do topo de uma conversa aberta no WhatsApp Web. */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <ChatAvatar nome={ticket.companyNome} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-text">{ticket.companyNome}</span>
          <span className="truncate text-xs text-text-muted">
            {ticket.assunto}
            {ticket.protocolo && <> · {ticket.protocolo}</>}
          </span>
        </div>
        {ticket.arquivado && <Badge variant="neutral">Arquivado</Badge>}
        <SupportTicketStatusBadge status={ticket.status} />
        <div className="flex items-center gap-0.5">
          {ticket.status !== "ENCERRADO" && (
            <HeaderIconButton
              label="Encerrar chamado"
              isLoading={closeTicket.isPending}
              onClick={() => closeTicket.mutate()}
            >
              <CheckCircle2 size={18} />
            </HeaderIconButton>
          )}
          {ticket.arquivado ? (
            <HeaderIconButton
              label="Desarquivar"
              isLoading={unarchiveTicket.isPending}
              onClick={() => unarchiveTicket.mutate()}
            >
              <ArchiveRestore size={18} />
            </HeaderIconButton>
          ) : (
            <HeaderIconButton
              label="Arquivar"
              isLoading={archiveTicket.isPending}
              onClick={() => archiveTicket.mutate()}
            >
              <Archive size={18} />
            </HeaderIconButton>
          )}
        </div>
      </div>

      {/* Corpo rolável — descrição original + resumo da IA fixos no topo da conversa, depois as mensagens em bolhas. */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-lg rounded-lg border border-border bg-surface px-4 py-3">
          <Typography variant="caption" color="muted">
            Chamado aberto por {ticket.abertoPorNome} ({ticket.abertoPorEmail})
          </Typography>
          <Typography variant="bodySmall" className="mt-1">
            {ticket.descricao}
          </Typography>
        </div>

        {ticket.resumoIA && (
          <div className="mx-auto flex max-w-lg items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <Typography variant="caption" color="muted">
                Resumo da IA
              </Typography>
              <Typography variant="bodySmall" className="mt-0.5">
                {ticket.resumoIA}
              </Typography>
            </div>
          </div>
        )}

        {ticket.mensagens.length === 0 ? (
          <Typography variant="bodySmall" color="muted" className="py-8 text-center">
            Nenhuma mensagem ainda. Responda abaixo.
          </Typography>
        ) : (
          ticket.mensagens.map((message) => {
            // "Nossa" (à direita, cor de destaque) = Admin Rotta ou a
            // própria IA de suporte; "deles" (à esquerda, neutra) = o
            // tenant que abriu o chamado — mesma lógica de lado que o
            // WhatsApp usa pra distinguir remetente numa conversa 1:1.
            const isOurs = message.autorIsAdminRotta || message.autorIsIA;
            return (
              <div key={message.id} className={`flex ${isOurs ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    message.autorIsIA
                      ? "rounded-tr-sm border border-primary/30 bg-primary/10"
                      : isOurs
                        ? "rounded-tr-sm bg-primary/15"
                        : "rounded-tl-sm bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {message.autorIsIA && <Sparkles className="h-3 w-3 text-primary" />}
                    <span className="text-xs font-semibold text-text-muted">
                      {message.autorIsIA ? "Rotta AI" : message.autorNome}
                    </span>
                  </div>
                  <Typography variant="body" className="whitespace-pre-wrap">
                    {message.mensagem}
                  </Typography>
                  <span className="mt-1 block text-right text-[10px] text-text-muted">
                    {formatRelativeChatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compositor fixo embaixo — Enter envia, Shift+Enter quebra linha (mesmo atalho do WhatsApp Web). */}
      <div className="flex items-end gap-2 border-t border-border bg-surface px-4 py-3">
        <textarea
          value={mensagem}
          onChange={(event) => setMensagem(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              enviar();
            }
          }}
          placeholder="Escreva uma mensagem..."
          rows={1}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <button
          type="button"
          aria-label="Enviar"
          disabled={mensagem.trim().length === 0 || addMessage.isPending}
          onClick={enviar}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {addMessage.isPending ? <Spinner size="sm" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
