"use client";

import { Badge, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";

import { useApprovalQueue } from "@/features/backoffice/hooks/use-backoffice";

/**
 * Central de Aprovações (Prompt 21) — une os 3 tipos de item que hoje
 * carregam um estado "pendente de revisão" na plataforma: documentos de
 * motorista (CNH/EAR/Cursos, Dossiê 28), documentos de veículo
 * (CRLV/Seguro/etc.) e contratos aguardando assinatura (Marketplace).
 * Leitura apenas nesta primeira fase — aprovar/reprovar em lote é item
 * do "Plano de evolução" do Dossiê 29.
 */
export default function AprovacoesPage(): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useApprovalQueue(50);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar a fila de aprovações."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        </Card.Body>
      </Card>
    );
  }

  const isEmpty =
    data.documentosMotorista.length === 0 &&
    data.documentosVeiculo.length === 0 &&
    data.contratos.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Central de Aprovações</Typography>

      {isEmpty && (
        <Card>
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhum item pendente de revisão no momento.
            </Typography>
          </Card.Body>
        </Card>
      )}

      {data.documentosMotorista.length > 0 && (
        <Card>
          <Card.Header title={`Documentos de motorista (${data.documentosMotorista.length})`} />
          <div className="divide-y divide-border">
            {data.documentosMotorista.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex flex-col gap-0.5">
                  <Typography variant="body" className="font-semibold">
                    {doc.userNome} · {doc.tipo}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {doc.companyNome} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </Typography>
                </div>
                <Badge variant={doc.rottaAiStatus === "REPROVADO" ? "danger" : "warning"}>
                  {doc.rottaAiStatus}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.documentosVeiculo.length > 0 && (
        <Card>
          <Card.Header title={`Documentos de veículo (${data.documentosVeiculo.length})`} />
          <div className="divide-y divide-border">
            {data.documentosVeiculo.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex flex-col gap-0.5">
                  <Typography variant="body" className="font-semibold">
                    {doc.vehiclePlaca} · {doc.tipo}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {doc.companyNome} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </Typography>
                </div>
                <Badge variant={doc.rottaAiStatus === "REPROVADO" ? "danger" : "warning"}>
                  {doc.rottaAiStatus}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.contratos.length > 0 && (
        <Card>
          <Card.Header title={`Contratos aguardando assinatura (${data.contratos.length})`} />
          <div className="divide-y divide-border">
            {data.contratos.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex flex-col gap-0.5">
                  <Typography variant="body" className="font-semibold">
                    {contract.studentNome}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {contract.companyNome} ·{" "}
                    {new Date(contract.createdAt).toLocaleDateString("pt-BR")}
                  </Typography>
                </div>
                <Badge variant="warning">{contract.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
