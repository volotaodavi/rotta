"use client";

import { ApiError } from "@rotta/api-client";
import { Button, Typography } from "@rotta/ui/web";
import { useState } from "react";

import { useApproveJoinRequest, useRejectJoinRequest } from "../hooks/use-join-requests";

import type { CompanyJoinRequestListItem, Role } from "@rotta/api-client";


const PAPEL_LABEL: Partial<Record<Role, string>> = {
  motorista: "Motorista",
  monitor: "Monitor",
};

/**
 * Uma linha de "Pedidos de vínculo pendentes" em Equipe (Frente N,
 * briefing item 9) — o próprio componente controla o estado local de
 * "recusar com motivo" (textarea só aparece ao clicar em Recusar),
 * mesmo padrão da tela de detalhe de Solicitação de Transporte do
 * Marketplace, só que compacto o bastante pra caber numa linha de lista.
 */
export function JoinRequestRow({ request }: { request: CompanyJoinRequestListItem }): JSX.Element {
  const approve = useApproveJoinRequest();
  const reject = useRejectJoinRequest();
  const [rejecting, setRejecting] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleApprove(): Promise<void> {
    setErrorMessage(null);
    try {
      await approve.mutateAsync(request.id);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado.");
    }
  }

  async function handleReject(): Promise<void> {
    setErrorMessage(null);
    try {
      await reject.mutateAsync({ id: request.id, motivo: motivo.trim() || undefined });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado.");
    }
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Typography variant="bodySmall" className="font-semibold">
            {request.userName}
          </Typography>
          <Typography variant="caption" color="muted">
            {PAPEL_LABEL[request.role] ?? request.role} · {request.userEmail} ·{" "}
            {request.userTelefone}
          </Typography>
          <Typography variant="caption" color="muted">
            Pediu vínculo em {new Date(request.createdAt).toLocaleDateString("pt-BR")}
          </Typography>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => void handleApprove()}
            isLoading={approve.isPending}
            disabled={rejecting}
          >
            Aprovar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setRejecting((current) => !current)}
            disabled={approve.isPending}
          >
            Recusar
          </Button>
        </div>
      </div>

      {rejecting ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <textarea
            className="min-h-16 flex-1 rounded-md border border-border bg-surface p-3 text-sm text-text outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            placeholder="Motivo da recusa (opcional)"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <Button variant="danger" onClick={() => void handleReject()} isLoading={reject.isPending}>
            Confirmar recusa
          </Button>
        </div>
      ) : null}

      {errorMessage ? (
        <Typography variant="caption" color="danger">
          {errorMessage}
        </Typography>
      ) : null}
    </div>
  );
}
