"use client";

import { Card, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { Vehicle, VehicleStatus, VehicleType } from "@rotta/api-client";

import { VehicleStatusBadge } from "@/features/vehicles/components/vehicle-status-badge";
import { useVehiclesList } from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";

/**
 * "Mapa" (briefing "MAPA" — "mostrar todos os veículos em tempo real,
 * filtros por motorista/empresa/status/tipo"). `packages/maps` ainda é
 * um stub vazio (nenhuma chave de Google Maps/Mapbox configurada) —
 * decisão de escopo deliberada (mesmo espírito do stub da Rotta AI):
 * esta tela já implementa os filtros reais e a última posição
 * conhecida de cada veículo (`Vehicle.ultimaLatitude/ultimaLongitude`,
 * Dossiê 15) em formato tabular; o mapa interativo substitui esta
 * tabela assim que o provedor de mapas for contratado.
 */
export default function VeiculosMapaPage(): JSX.Element {
  const [status, setStatus] = useState<VehicleStatus | "">("");
  const [tipo, setTipo] = useState<VehicleType | "">("");

  const { data, isLoading } = useVehiclesList({
    status: status || undefined,
    tipo: tipo || undefined,
    pageSize: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Mapa da frota</Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            Mapa interativo em preparação — nenhum provedor de mapas (Google Maps/Mapbox) está
            configurado ainda. Esta tabela mostra a última posição conhecida de cada veículo.
          </Typography>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as VehicleStatus | "")}
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
              onChange={(event) => setTipo(event.target.value as VehicleType | "")}
            >
              <option value="">Todos os tipos</option>
              {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading || !data ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <Table<Vehicle>
              columns={[
                {
                  key: "placa",
                  header: "Placa",
                  render: (v) => <span className="font-mono">{v.placa}</span>,
                },
                { key: "modelo", header: "Modelo", render: (v) => v.modelo },
                {
                  key: "status",
                  header: "Status",
                  render: (v) => <VehicleStatusBadge status={v.status} />,
                },
                {
                  key: "posicao",
                  header: "Última posição",
                  render: (v) =>
                    v.ultimaLatitude && v.ultimaLongitude
                      ? `${v.ultimaLatitude.toFixed(5)}, ${v.ultimaLongitude.toFixed(5)}`
                      : "Sem posição registrada",
                },
                {
                  key: "atualizacao",
                  header: "Última atualização",
                  render: (v) =>
                    v.ultimaPosicaoEm ? new Date(v.ultimaPosicaoEm).toLocaleString("pt-BR") : "—",
                },
              ]}
              rows={data.items}
              keyExtractor={(v) => v.id}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
