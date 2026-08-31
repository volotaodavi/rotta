"use client";

import { type RottaMapMarker } from "@rotta/maps/types";
import { Card, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { BoundingBoxInput } from "@rotta/api-client";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { useSchoolMarkers } from "@/features/schools/hooks/use-school-markers";

/**
 * "Mapa Nacional de Escolas" — visão CROSS-TENANT do Admin Rotta sobre
 * o catálogo compartilhado (mesmo escopo de `/escolas`, sem filtro de
 * `companyId` por padrão), mas via o Map Intelligence Agent (Rotta Geo
 * Platform) em vez de uma tabela: `GET /geo/mapa/marcadores` retorna só
 * as Escolas `ATIVA` dentro da janela visível do mapa (índice espacial
 * GiST + cache Redis no backend), refeito a cada pan/zoom
 * (`onBoundsChange`) — pensado para o volume nacional de escolas, ao
 * contrário de `/escolas` (paginação tradicional).
 */
export default function EscolasMapaAdminPage(): JSX.Element {
  const router = useRouter();
  const [bounds, setBounds] = useState<BoundingBoxInput | null>(null);
  const { data: schoolMarkers, isLoading } = useSchoolMarkers(bounds);

  const markers = useMemo<RottaMapMarker[]>(
    () =>
      (schoolMarkers ?? []).map((marker) => ({
        id: marker.id,
        titulo: marker.nomeOficial,
        latitude: marker.latitude,
        longitude: marker.longitude,
      })),
    [schoolMarkers],
  );

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Mapa nacional de escolas</Typography>
      <Typography variant="bodySmall" color="muted">
        Escolas ativas do catálogo compartilhado, carregadas pelo Map Intelligence Agent conforme
        você navega pelo mapa.
      </Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="relative" style={{ height: 640 }}>
            {isLoading && bounds && (
              <div className="absolute right-3 top-3 z-10">
                <Spinner size="sm" />
              </div>
            )}
            <RottaMap
              markers={markers}
              initialZoom={4}
              onBoundsChange={setBounds}
              onMarkerPress={(marker) => router.push(`/escolas/${marker.id}`)}
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
