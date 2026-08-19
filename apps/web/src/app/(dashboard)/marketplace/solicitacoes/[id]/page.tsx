"use client";

import { ApiError } from "@rotta/api-client";
import { Button, Card, ErrorState, FormField, Input, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent } from "react";

import { TransportRequestStatusBadge } from "@/features/marketplace/components/transport-request-status-badge";
import {
  useAprovarTransportRequest,
  useContractsList,
  useGerarContrato,
  useMarcarTransportRequestEmAnalise,
  useRecusarTransportRequest,
  useTransportRequest,
} from "@/features/marketplace/hooks/use-marketplace";

/**
 * Detalhe de uma solicitação de transporte (briefing "Marketplace"
 * §"SOLICITAR TRANSPORTE"/"CONTRATO") — ações de transição de status
 * (em análise/aprovar/recusar) e, quando Aprovada e ainda sem contrato,
 * o formulário de geração de contrato. RBAC do backend garante que só
 * a Empresa/Gestor dona da solicitação chega até aqui (404 fora do
 * escopo).
 */
export default function SolicitacaoTransporteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const router = useRouter();
  const { data: request, isLoading, isError, refetch, isFetching } = useTransportRequest(id);
  const { data: contracts } = useContractsList({ pageSize: 100 });
  const marcarEmAnalise = useMarcarTransportRequestEmAnalise(id);
  const aprovar = useAprovarTransportRequest(id);
  const recusar = useRecusarTransportRequest(id);
  const gerarContrato = useGerarContrato(id);

  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [valorMensalidade, setValorMensalidade] = useState("");
  const [planoDescricao, setPlanoDescricao] = useState("");
  const [regras, setRegras] = useState("");
  const [vigenciaInicio, setVigenciaInicio] = useState("");
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [monitorId, setMonitorId] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  /**
   * Achado real (pedido do usuário: "tá dando erro ao ver quem
   * solicitou o transporte"): esta tela nunca tratava `isError` —
   * quando a busca falhava (ex. cold start do Render), `isLoading`
   * virava `false` e `request` continuava `undefined` pra sempre: a
   * tela ficava travada num spinner infinito, sem nenhum jeito de
   * tentar de novo. Mesmo padrão `ErrorState` já usado no resto do
   * painel.
   */
  if (isError || !request) {
    return (
      <ErrorState
        message="Não foi possível carregar esta solicitação."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const contratoExistente = contracts?.items.find((c) => c.transportRequestId === id) ?? null;

  async function runAction(action: () => Promise<unknown>): Promise<void> {
    setErrorMessage(null);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado.");
    }
  }

  async function handleRecusar(): Promise<void> {
    await runAction(() => recusar.mutateAsync(motivoRecusa));
  }

  async function handleGerarContrato(event: FormEvent): Promise<void> {
    event.preventDefault();
    await runAction(() =>
      gerarContrato.mutateAsync({
        valorMensalidadeCentavos: Math.round(Number(valorMensalidade) * 100),
        planoDescricao,
        regras,
        vigenciaInicio,
        vigenciaFim: vigenciaFim || undefined,
        vehicleId: vehicleId || undefined,
        motoristaId: motoristaId || undefined,
        monitorId: monitorId || undefined,
      }),
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
          <Typography variant="body" className="font-semibold">
            {request.studentNome ?? "Aluno"}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Responsável: {request.responsavelNome ?? "—"}
            {request.responsavelTelefone ? ` · ${request.responsavelTelefone}` : ""}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Escola: {request.schoolNome ?? "—"}
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

      {errorMessage ? (
        <Typography variant="bodySmall" color="danger">
          {errorMessage}
        </Typography>
      ) : null}

      {request.status === "RECEBIDA" ? (
        <Card>
          <Card.Body className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => void runAction(() => marcarEmAnalise.mutateAsync())}
              isLoading={marcarEmAnalise.isPending}
            >
              Marcar em análise
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      {request.status === "RECEBIDA" || request.status === "EM_ANALISE" ? (
        <Card>
          <Card.Header title="Decisão" />
          <Card.Body className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => void runAction(() => aprovar.mutateAsync())}
                isLoading={aprovar.isPending}
              >
                Aprovar solicitação
              </Button>
            </div>
            <FormField label="Motivo da recusa" helperText="Necessário apenas se for recusar.">
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-surface p-3 text-sm text-text outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                value={motivoRecusa}
                onChange={(event) => setMotivoRecusa(event.target.value)}
              />
            </FormField>
            <Button
              variant="secondary"
              onClick={() => void handleRecusar()}
              isLoading={recusar.isPending}
              disabled={motivoRecusa.trim().length === 0}
            >
              Recusar solicitação
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      {request.status === "APROVADA" && !contratoExistente ? (
        <Card>
          <Card.Header title="Gerar contrato" />
          <Card.Body>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => void handleGerarContrato(event)}
            >
              <FormField label="Mensalidade (R$)" isRequired>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorMensalidade}
                  onChange={(event) => setValorMensalidade(event.target.value)}
                  required
                />
              </FormField>
              <FormField label="Descrição do plano" isRequired>
                <Input
                  value={planoDescricao}
                  onChange={(event) => setPlanoDescricao(event.target.value)}
                  required
                />
              </FormField>
              <FormField label="Regras do contrato" isRequired>
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-surface p-3 text-sm text-text outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  value={regras}
                  onChange={(event) => setRegras(event.target.value)}
                  required
                />
              </FormField>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Vigência (início)" isRequired>
                  <Input
                    type="date"
                    value={vigenciaInicio}
                    onChange={(event) => setVigenciaInicio(event.target.value)}
                    required
                  />
                </FormField>
                <FormField
                  label="Vigência (fim)"
                  helperText="Opcional — em branco para indeterminado."
                >
                  <Input
                    type="date"
                    value={vigenciaFim}
                    onChange={(event) => setVigenciaFim(event.target.value)}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField label="Veículo (ID)" helperText="Opcional">
                  <Input value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} />
                </FormField>
                <FormField label="Motorista (ID)" helperText="Opcional">
                  <Input
                    value={motoristaId}
                    onChange={(event) => setMotoristaId(event.target.value)}
                  />
                </FormField>
                <FormField label="Monitor (ID)" helperText="Opcional">
                  <Input value={monitorId} onChange={(event) => setMonitorId(event.target.value)} />
                </FormField>
              </div>
              <Button type="submit" variant="primary" isLoading={gerarContrato.isPending}>
                Gerar contrato
              </Button>
            </form>
          </Card.Body>
        </Card>
      ) : null}

      {contratoExistente ? (
        <Card>
          <Card.Body className="flex items-center justify-between">
            <Typography variant="bodySmall" color="muted">
              Contrato já gerado para esta solicitação.
            </Typography>
            <Button
              variant="secondary"
              onClick={() => router.push(`/marketplace/contratos/${contratoExistente.id}`)}
            >
              Ver contrato
            </Button>
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}
