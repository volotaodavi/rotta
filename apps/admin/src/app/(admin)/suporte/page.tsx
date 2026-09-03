"use client";

import { MessageCircle } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";

/**
 * Estado "nenhuma conversa selecionada" — mesmo papel da tela inicial
 * do WhatsApp Web antes de escolher um contato. A lista de conversas
 * já está sempre visível à esquerda (`(suporte)/layout.tsx`), esta
 * página só ocupa o painel direito enquanto nada foi clicado.
 */
export default function SuportePage(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MessageCircle className="h-8 w-8 text-text-muted" />
      </div>
      <Typography variant="subtitle">Central de Atendimento</Typography>
      <Typography variant="bodySmall" color="muted" className="max-w-xs">
        Selecione uma conversa à esquerda pra ver o chamado e responder.
      </Typography>
    </div>
  );
}
