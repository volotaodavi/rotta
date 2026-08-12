"use client";

import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Card, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { MapVehicle } from "@rotta/api-client";

import { useGpsMapNationwide } from "@/features/gps/hooks/use-gps";

/**
 * "Mapa Nacional de Veículos" — visão CROSS-TENANT do Admin Rotta sobre
 * todas as viagens `EM_ANDAMENTO` agora, de TODAS as empresas ao mesmo
 * tempo (equivalente ao "Mapa Nacional de Escolas" já existente em
 * `/escolas/mapa`, que faltava aqui — `GET /gps/map` sem `companyId`
 * agora devolve isso em vez do 400 antigo que obrigava escolher uma
 * empresa primeiro, ver `TripsService.listActiveForMap`). Cada
 * marcador vem com `companyNome` pra identificar de qual transportadora
 * é. Atualiza sozinho a cada 10s, mesmo princípio do mapa por tenant em
 * `apps/web` (`/veiculos/mapa`).
 */
export default function VeiculosMapaNacionalPage(): JSX.Element {
  const router = useRouter();
  const { data, isLoading } = useGpsMapNationwide();
  const [selected, setSelected] = useState<MapVehicle | null>(null);

  const markers = useMemo<RottaMapMarker[]>(
    () =>
      (data ?? [])
        .filter((v): v is MapVehicle & { latitude: number; longitude: number } =>
          Boolean(v.latitude && v.longitude),
        )
        .map((v) => ({
          id: v.tripId,
          titulo: `${v.placa} — ${v.companyNome ?? "Empresa"} (${v.routeNome})`,
          latitude: v.latitude,
          longitude: v.longitude,
          emMovimento: true,
        })),
    [data],
  );

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Mapa nacional de veículos</Typography>
      <Typography variant="bodySmall" color="muted">
        Todos os veículos em viagem agora, de todas as empresas. Atualiza automaticamente a cada 10
        segundos.
      </Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            {data?.length ?? 0} veículo(s) em viagem agora.
          </Typography>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : markers.length === 0 ? (
            <Typography variant="bodySmall" color="muted">
              Nenhum veículo em viagem no momento, em nenhuma empresa.
            </Typography>
          ) : (
            <div className="relative" style={{ height: 640 }}>
              <RottaMap
                markers={markers}
                initialZoom={4}
                onMarkerPress={(marker) =>
                  setSelected(data?.find((v) => v.tripId === marker.id) ?? null)
                }
              />
            </div>
          )}

          {selected ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
              <Badge variant="info">{selected.placa}</Badge>
              {selected.companyNome ? (
                <Badge variant="neutral">{selected.companyNome}</Badge>
              ) : null}
              <Typography variant="bodySmall">
                {selected.routeNome} ({selected.turno}) — motorista {selected.motoristaNome}
                {selected.monitorNome ? `, monitor ${selected.monitorNome}` : ""}
              </Typography>
              {selected.companyId ? (
                <button
                  type="button"
                  className="ml-auto text-sm text-primary hover:underline"
                  onClick={() => router.push(`/empresas/${selected.companyId}`)}
                >
                  Ver empresa
                </button>
              ) : null}
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
