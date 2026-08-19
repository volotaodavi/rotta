"use client";

import { Button, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { use } from "react";

import { TransportRequestStatusBadge } from "@/features/marketplace/components/transport-request-status-badge";
import { useTransportRequest } from "@/features/marketplace/hooks/use-marketplace";

/**
 * Detalhe de uma solicitação de transporte — visão CROSS-TENANT,
 * somente leitura, do Admin Rotta (mesma decisão de `/veiculos/[id]`:
 * sem ações de transição de status, que são exclusivas da Empresa/
 * Gestor dona da solicitação).
 */
export default function SolicitacaoTransporteAdminDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const router = useRouter();
  const { data: request, isLoading, isError, refetch, isFetching } = useTransportRequest(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  /** Achado real (auditoria "tá dando erro ao ver quem solicitou o transporte"): sem isso, uma falha na busca deixava a tela presa num spinner infinito, sem erro visível nem botão de tentar de novo. */
  if (isError || !request) {
    return (
      <ErrorState
        message="Não foi possível carregar esta solicitação."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Typography variant="title">Solicitação de Transporte</Typography>
          <TransportRequestStatusBadge status={request.status} />
        </div>
        <Button variant="ghost" onClick={() => router.push("/marketplace/solicitacoes")}>
          Voltar
        </Button>
      </div>

      <Card>
        <Card.Header title="Dados da solicitação" />
        <Card.Body className="flex flex-col gap-2">
          <Typography variant="bodySmall" color="muted">
            Transportadora: {request.companyNome ?? "Não informada"}
          </Typography>
          <Typography variant="body" className="font-semibold">
            {request.studentNome ?? "Aluno"}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Responsável: {request.responsavelNome ?? "Não informado"}
            {request.responsavelTelefone ? ` · ${request.responsavelTelefone}` : ""}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Escola: {request.schoolNome ?? "Não informada"}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Turno: {request.turno}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Recebida em: {new Date(request.createdAt).toLocaleDateString("pt-BR")}
          </Typography>
          {request.status === "RECUSADA" && request.motivoRecusa ? (
            <Typography variant="bodySmall" color="danger">
              Motivo da recusa: {request.motivoRecusa}
            </Typography>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
