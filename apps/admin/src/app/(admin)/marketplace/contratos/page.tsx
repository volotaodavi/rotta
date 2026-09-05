"use client";

import { FileText } from "@rotta/icons";
import {
  Card,
  EmptyState,
  ErrorState,
  Select,
  Table,
  TableSkeleton,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type { Contract, ContractStatus } from "@rotta/api-client";

import { ContractStatusBadge } from "@/features/marketplace/components/contract-status-badge";
import { useContractsList } from "@/features/marketplace/hooks/use-marketplace";

const STATUS_OPTIONS: ContractStatus[] = ["AGUARDANDO_ASSINATURA", "ATIVO", "ENCERRADO"];

/**
 * Listagem de contratos — visão CROSS-TENANT exclusiva do Admin Rotta.
 * A API não tem filtro de status para contratos (só página/tamanho) —
 * o filtro abaixo é aplicado sobre o lote carregado, mesma decisão do
 * Painel Web (`apps/web/.../marketplace/contratos/page.tsx`).
 */
export default function ContratosAdminPage(): JSX.Element {
  const [status, setStatus] = useState<ContractStatus | "">("");

  const { data, isLoading, isError, refetch, isFetching } = useContractsList({ pageSize: 100 });
  const items = status ? data?.items.filter((contract) => contract.status === status) : data?.items;

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Contratos</Typography>
      <Typography variant="bodySmall" color="muted">
        Visão consolidada dos contratos do Marketplace de todas as empresas cadastradas.
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
            <TableSkeleton columns={4} />
          ) : isError ? (
            <ErrorState
              message="Não foi possível carregar os contratos."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : !items || items.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum contrato encontrado." />
          ) : (
            <Table<Contract>
              columns={[
                {
                  key: "id",
                  header: "Contrato",
                  render: (contract) => <span className="font-mono text-xs">{contract.id}</span>,
                },
                {
                  key: "companyId",
                  header: "Empresa (ID)",
                  render: (contract) => (
                    <span className="font-mono text-xs">{contract.companyId}</span>
                  ),
                },
                {
                  key: "valorMensalidadeCentavos",
                  header: "Mensalidade",
                  render: (contract) =>
                    `R$ ${(contract.valorMensalidadeCentavos / 100).toFixed(2)}`,
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
