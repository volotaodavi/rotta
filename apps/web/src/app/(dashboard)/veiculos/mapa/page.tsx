"use client";

import { type RottaMapMarker } from "@rotta/maps/types";
import { Badge, Card, Spinner, Typography } from "@rotta/ui/web";
import { useMemo, useState } from "react";

import type { MapVehicle } from "@rotta/api-client";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { useGpsMap } from "@/features/gps/hooks/use-gps";

/**
 * "Mapa"/localizador em tempo real (briefing "MAPA" — "mostrar todos
 * os veículos em tempo real"). Mapa real via `@rotta/maps/web`
 * (MapLibre GL JS sobre OpenStreetMap, sem token — mesmo componente de
 * Escolas/Marketplace), alimentado por `GET /gps/map` (GPS-01/03/06):
 * um marcador por VIAGEM em andamento agora, com a última posição
 * conhecida do veículo. Atualiza sozinho a cada 10s (`useGpsMap`) —
 * substitui o polling por um canal em tempo real (WebSocket,
 * `apps/realtime-gateway`) quando esse serviço existir.
 *
 * Veículos sem viagem em andamento não aparecem aqui (não há posição
 * "ao vivo" para eles) — a última posição estática de qualquer veículo
 * continua disponível em `/veiculos/:id`.
 */
export default function VeiculosMapaPage(): JSX.Element {
  const { data, isLoading } = useGpsMap();
  const [selected, setSelected] = useState<MapVehicle | null>(null);

  const markers = useMemo<RottaMapMarker[]>(
    () =>
      (data ?? [])
        .filter((v): v is MapVehicle & { latitude: number; longitude: number } =>
          Boolean(v.latitude && v.longitude),
        )
        .map((v) => ({
          id: v.tripId,
          titulo: `${v.placa}: ${v.routeNome} (${v.motoristaNome})`,
          latitude: v.latitude,
          longitude: v.longitude,
          // Todo marcador aqui é uma viagem EM_ANDAMENTO agora — sempre
          // um veículo em movimento, nunca uma posição estática.
          emMovimento: true,
        })),
    [data],
  );

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Localizador: mapa em tempo real</Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            {data?.length ?? 0} veículo(s) em viagem agora. Atualiza automaticamente a cada 10
            segundos.
          </Typography>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : markers.length === 0 ? (
            <Typography variant="bodySmall" color="muted">
              Nenhum veículo em viagem no momento.
            </Typography>
          ) : (
            <div style={{ height: 560 }}>
              <RottaMap
                markers={markers}
                onMarkerPress={(marker) =>
                  setSelected(data?.find((v) => v.tripId === marker.id) ?? null)
                }
              />
            </div>
          )}

          {selected ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
              <Badge variant="info">{selected.placa}</Badge>
              <Typography variant="bodySmall">
                {selected.routeNome} ({selected.turno}), motorista {selected.motoristaNome}
                {selected.monitorNome ? `, monitor ${selected.monitorNome}` : ""}
              </Typography>
              <Typography variant="bodySmall" color="muted">
                {selected.ultimaPosicaoEm
                  ? `Última posição: ${new Date(selected.ultimaPosicaoEm).toLocaleTimeString("pt-BR")}`
                  : "Aguardando primeira posição"}
              </Typography>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
