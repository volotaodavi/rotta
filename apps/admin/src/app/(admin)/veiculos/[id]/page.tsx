"use client";

import { Badge, Card, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { use } from "react";

import type { VehicleAuditLog, VehicleStatus } from "@rotta/api-client";

import { VehicleStatusBadge } from "@/features/vehicles/components/vehicle-status-badge";
import {
  useUpdateVehicleStatus,
  useVehicle,
  useVehicleAuditLogs,
} from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";

const STATUS_OPTIONS: VehicleStatus[] = [
  "DISPONIVEL",
  "EM_VIAGEM",
  "MANUTENCAO",
  "RESERVA",
  "INATIVO",
  "BLOQUEADO",
];

/**
 * Detalhes de um veículo — visão de FISCALIZAÇÃO do Admin Rotta (suporte
 * multi-tenant/auditoria), não a tela de gestão operacional completa que
 * já existe em `apps/web` (aquela tem abas de Documentos/Manutenções/
 * Lembretes/Vínculos/Checklist/Ocorrências — operação do dia a dia da
 * própria Empresa/Gestor). Aqui: dados básicos, troca de status
 * (intervenção pontual de suporte) e o log de auditoria — sem cadastro,
 * já que Admin Rotta não tem tenant próprio.
 */
export default function VeiculoAdminDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const { data: vehicle, isLoading, isError } = useVehicle(id);
  const { data: auditLogs } = useVehicleAuditLogs(id);
  const updateStatus = useUpdateVehicleStatus(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <Typography variant="body" color="danger">
        Não foi possível carregar este veículo.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Typography variant="title" className="font-mono">
              {vehicle.placa}
            </Typography>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <Typography variant="caption" color="muted">
            {vehicle.modelo} {vehicle.marca ? `, ${vehicle.marca}` : ""} · Empresa (ID):{" "}
            <span className="font-mono">{vehicle.companyId}</span>
          </Typography>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={vehicle.status}
            disabled={updateStatus.isPending}
            onChange={(event) => updateStatus.mutate(event.target.value as VehicleStatus)}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <Card.Header
          title="Dados do veículo"
          action={<Badge variant="neutral">{VEHICLE_CATEGORY_LABEL[vehicle.categoria]}</Badge>}
        />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoItem label="Tipo" value={VEHICLE_TYPE_LABEL[vehicle.tipo]} />
          <InfoItem label="Ano" value={vehicle.ano?.toString() ?? "Não informado"} />
          <InfoItem label="Cor" value={vehicle.cor ?? "Não informado"} />
          <InfoItem label="RENAVAM" value={vehicle.renavam ?? "Não informado"} />
          <InfoItem label="Chassi" value={vehicle.chassi ?? "Não informado"} />
          <InfoItem
            label="Capacidade de passageiros"
            value={vehicle.capacidadePassageiros.toString()}
          />
          <InfoItem
            label="Quilometragem atual"
            value={`${vehicle.quilometragemAtual.toLocaleString("pt-BR")} km`}
          />
          <InfoItem
            label="Último motorista (ID)"
            value={vehicle.ultimoMotoristaId ?? "Não informado"}
          />
          <InfoItem
            label="Último monitor (ID)"
            value={vehicle.ultimoMonitorId ?? "Não informado"}
          />
          <InfoItem
            label="Última posição"
            value={
              vehicle.ultimaLatitude && vehicle.ultimaLongitude
                ? `${vehicle.ultimaLatitude}, ${vehicle.ultimaLongitude}`
                : "Não informado"
            }
          />
          <InfoItem
            label="Atualizado em"
            value={
              vehicle.ultimaPosicaoEm
                ? new Date(vehicle.ultimaPosicaoEm).toLocaleString("pt-BR")
                : "Nunca atualizada"
            }
          />
          <InfoItem label="Observações" value={vehicle.observacoes ?? "Não informado"} />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Auditoria" />
        <Card.Body>
          <Table<VehicleAuditLog>
            columns={[
              {
                key: "acao",
                header: "Ação",
                render: (log) => log.acao,
              },
              {
                key: "ator",
                header: "Autor (ID)",
                render: (log) => (
                  <span className="font-mono text-xs">{log.atorUserId ?? "Não informado"}</span>
                ),
              },
              {
                key: "data",
                header: "Data",
                render: (log) => new Date(log.createdAt).toLocaleString("pt-BR"),
              },
            ]}
            rows={auditLogs?.items ?? []}
            keyExtractor={(log) => log.id}
            emptyMessage="Nenhum registro de auditoria para este veículo."
          />
        </Card.Body>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </div>
  );
}
