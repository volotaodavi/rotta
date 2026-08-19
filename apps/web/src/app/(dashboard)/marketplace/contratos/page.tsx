"use client";

import { Card, ErrorState, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { Contract, ContractStatus } from "@rotta/api-client";

import { ContractStatusBadge } from "@/features/marketplace/components/contract-status-badge";
import { useContractsList } from "@/features/marketplace/hooks/use-marketplace";


const STATUS_OPTIONS: ContractStatus[] = ["AGUARDANDO_ASSINATURA", "ATIVO", "ENCERRADO"];

/**
 * Listagem de contratos do Marketplace (briefing "Marketplace"
 * §"CONTRATO") — visão da própria Empresa/Gestor (RBAC do backend já
 * restringe ao `companyId` do ator). A API não tem filtro de status
 * (só página/tamanho) — o filtro abaixo é aplicado sobre o lote
 * carregado, mesma decisão de `use-transport-state.ts` no app mobile
 * (nunca duplicar uma regra de escopo que o backend já resolve, mas
 * filtros de exibição podem viver no cliente).
 */
export default function ContratosPage(): JSX.Element {
  const [status, setStatus] = useState<ContractStatus | "">("");

  const { data, isLoading, isError, refetch, isFetching } = useContractsList({ pageSize: 100 });
  const items = status ? data?.items.filter((contract) => contract.status === status) : data?.items;

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Contratos</Typography>
      <Typography variant="bodySmall" color="muted">
        Contratos gerados a partir de solicitações de transporte aprovadas.
      </Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as ContractStatus | "")}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <ErrorState
              message="Não foi possível carregar os contratos."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : !items || items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhum contrato encontrado.
            </Typography>
          ) : (
            <Table<Contract>
              columns={[
                {
                  key: "id",
                  header: "Contrato",
                  render: (contract) => <span className="font-mono text-xs">{contract.id}</span>,
                },
                {
                  key: "valorMensalidadeCentavos",
                  header: "Mensalidade",
                  render: (contract) =>
                    `R$ ${(contract.valorMensalidadeCentavos / 100).toFixed(2)}`,
                },
                {
                  key: "vigenciaInicio",
                  header: "Vigência",
                  render: (contract) =>
                    new Date(contract.vigenciaInicio).toLocaleDateString("pt-BR"),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (contract) => <ContractStatusBadge status={contract.status} />,
                },
              ]}
              rows={items}
              keyExtractor={(contract) => contract.id}
              onRowClick={(contract) => {
                window.location.href = `/marketplace/contratos/${contract.id}`;
              }}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
