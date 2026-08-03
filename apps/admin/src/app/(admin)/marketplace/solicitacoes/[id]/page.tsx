"use client";

import { Button, Card, Spinner, Typography } from "@rotta/ui/web";
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
  const { data: request, isLoading } = useTransportRequest(id);

  if (isLoading || !request) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
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
            Empresa (ID): <span className="font-mono">{request.companyId}</span>
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Responsável (ID): <span className="font-mono">{request.responsavelId}</span>
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Aluno (ID): <span className="font-mono">{request.studentId}</span>
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Escola (ID): <span className="font-mono">{request.schoolId}</span>
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
