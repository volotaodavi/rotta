"use client";

import { Card, Input, Pagination, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { ListVehiclesParams, Vehicle, VehicleStatus, VehicleType } from "@rotta/api-client";

import { VehicleStatusBadge } from "@/features/vehicles/components/vehicle-status-badge";
import { useVehiclesList } from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";


/**
 * Listagem de veículos — visão CROSS-TENANT exclusiva do Admin Rotta
 * (mesma decisão estrutural de `/empresas`: Admin Rotta enxerga a frota
 * de TODAS as empresas, não apenas uma). Sem "Novo veículo": Admin Rotta
 * não tem tenant próprio, logo não cadastra veículos (briefing
 * "PERMISSÕES" — cadastro é exclusivo de Administrador Empresa/Gestor).
 *
 * O filtro `companyId` (texto livre, já que não há endpoint de busca de
 * empresas por nome nesta tela) é o único que restringe a visão — sem
 * ele, a API retorna veículos de todos os tenants (Admin Rotta tem
 * bypass de RLS).
 */
export default function VeiculosAdminPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "">("");
  const [tipo, setTipo] = useState<VehicleType | "">("");
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params: ListVehiclesParams = {
    search: search || undefined,
    status: status || undefined,
    tipo: tipo || undefined,
    companyId: companyId || undefined,
    page,
    pageSize,
  };

  const { data, isLoading, isError } = useVehiclesList(params);

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Veículos</Typography>
      <Typography variant="bodySmall" color="muted">
        Visão consolidada da frota de todas as empresas cadastradas na plataforma.
      </Typography>

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
            <Input
              placeholder="ID da empresa (companyId)"
              value={companyId}
              onChange={(event) => {
                setPage(1);
                setCompanyId(event.target.value);
              }}
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

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <Typography variant="body" color="danger">
              Não foi possível carregar os veículos. Tente novamente.
            </Typography>
          ) : data && data.items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhum veículo encontrado.
            </Typography>
          ) : (
            data && (
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
                      key: "companyId",
                      header: "Empresa (ID)",
                      render: (vehicle) => (
                        <span className="font-mono text-xs">{vehicle.companyId}</span>
                      ),
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
            )
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
