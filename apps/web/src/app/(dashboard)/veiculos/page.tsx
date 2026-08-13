"use client";

import {
  Button,
  Card,
  Input,
  Pagination,
  Select,
  Spinner,
  Table,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { ListVehiclesParams, Vehicle, VehicleStatus, VehicleType } from "@rotta/api-client";

import { VehicleStatusBadge } from "@/features/vehicles/components/vehicle-status-badge";
import { useVehicleDashboard, useVehiclesList } from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";
import { vehiclesApi } from "@/lib/api-client";

/**
 * Listagem + Dashboard de Veículos (briefing "Gestão de Veículos" —
 * seções "DASHBOARD" e "PESQUISA") — mesma decisão de escopo de
 * `/empresa`: uma única tela combina os contadores e a listagem, já que
 * este é o painel da própria empresa (não uma listagem cross-tenant
 * como em `apps/admin`).
 */
export default function VeiculosPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "">("");
  const [tipo, setTipo] = useState<VehicleType | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params: ListVehiclesParams = {
    search: search || undefined,
    status: status || undefined,
    tipo: tipo || undefined,
    page,
    pageSize,
  };

  const { data: dashboard } = useVehicleDashboard();
  const { data, isLoading } = useVehiclesList(params);

  async function handleExport(format: "csv" | "excel" | "pdf"): Promise<void> {
    const blob = await vehiclesApi.exportList({ ...params, page: 1, pageSize: 10_000, format });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veiculos.${format === "excel" ? "xlsx" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Veículos</Typography>
        <div className="flex gap-3">
          <Link href="/veiculos/mapa" className={buttonVariants({ variant: "secondary" })}>
            Mapa
          </Link>
          <Link href="/veiculos/novo" className={buttonVariants({ variant: "primary" })}>
            Novo veículo
          </Link>
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total", value: dashboard.totalVeiculos },
            { label: "Ativos", value: dashboard.veiculosAtivos },
            { label: "Em viagem", value: dashboard.veiculosEmViagem },
            { label: "Em manutenção", value: dashboard.veiculosEmManutencao },
            { label: "Capacidade total", value: dashboard.capacidadeTotalPassageiros },
            {
              label: "Km percorridos",
              value: dashboard.quilometragemTotal.toLocaleString("pt-BR"),
            },
          ].map((metric) => (
            <Card key={metric.label}>
              <Card.Body className="flex flex-col gap-1">
                <Typography variant="caption" color="muted">
                  {metric.label}
                </Typography>
                <Typography variant="subtitle">{metric.value}</Typography>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {dashboard && dashboard.alertas.length > 0 && (
        <Card>
          <Card.Header title="Alertas" />
          <Card.Body className="flex flex-col gap-2">
            {dashboard.alertas.map((alerta) => (
              <Typography key={alerta} variant="bodySmall" color="danger">
                {alerta}
              </Typography>
            ))}
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input
              placeholder="Buscar por placa, modelo ou marca"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              className="sm:col-span-2"
            />
            <Select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as VehicleStatus | "");
              }}
            >
              <option value="">Todos os status</option>
              {(
                [
                  "DISPONIVEL",
                  "EM_VIAGEM",
                  "MANUTENCAO",
                  "RESERVA",
                  "INATIVO",
                  "BLOQUEADO",
                ] as VehicleStatus[]
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Select
              value={tipo}
              onChange={(event) => {
                setPage(1);
                setTipo(event.target.value as VehicleType | "");
              }}
            >
              <option value="">Todos os tipos</option>
              {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => void handleExport("csv")}>
              Exportar CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleExport("excel")}>
              Exportar Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleExport("pdf")}>
              Exportar PDF
            </Button>
          </div>

          {isLoading || !data ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <Table<Vehicle>
                columns={[
                  {
                    key: "placa",
                    header: "Placa",
                    render: (vehicle) => <span className="font-mono">{vehicle.placa}</span>,
                  },
                  { key: "modelo", header: "Modelo", render: (vehicle) => vehicle.modelo },
                  { key: "marca", header: "Marca", render: (vehicle) => vehicle.marca ?? "—" },
                  {
                    key: "tipo",
                    header: "Tipo",
                    render: (vehicle) => VEHICLE_TYPE_LABEL[vehicle.tipo],
                  },
                  {
                    key: "capacidade",
                    header: "Capacidade",
                    render: (vehicle) => vehicle.capacidadePassageiros,
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (vehicle) => <VehicleStatusBadge status={vehicle.status} />,
                  },
                ]}
                rows={data.items}
                keyExtractor={(vehicle) => vehicle.id}
                onRowClick={(vehicle) => {
                  window.location.href = `/veiculos/${vehicle.id}`;
                }}
              />
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data.total}
                onPageChange={setPage}
              />
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
