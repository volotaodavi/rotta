"use client";

import { type RottaMapMarker } from "@rotta/maps/types";
import { Card, Select, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { School, SchoolShift, SchoolType } from "@rotta/api-client";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { useSchoolsList } from "@/features/schools/hooks/use-schools";
import { SCHOOL_SHIFT_LABEL, SCHOOL_TYPE_LABEL } from "@/features/schools/labels";

/**
 * "Mapa" (briefing "MAPA" — "exibir todas as escolas, permitir
 * filtros, agrupar por cidade") — Rotta Geo Platform, Map Intelligence
 * Agent (backend). Mapa real via `@rotta/maps/web` (MapLibre GL JS
 * sobre OpenStreetMap, sem token).
 */
export default function EscolasMapaPage(): JSX.Element {
  const router = useRouter();
  const [tipo, setTipo] = useState<SchoolType | "">("");
  const [turno, setTurno] = useState<SchoolShift | "">("");

  const { data, isLoading } = useSchoolsList({
    tipo: tipo || undefined,
    turno: turno || undefined,
    pageSize: 100,
    sortBy: "cidade",
    sortOrder: "asc",
  });

  const markers = useMemo<RottaMapMarker[]>(
    () =>
      (data?.items ?? [])
        .filter((school): school is School & { latitude: number; longitude: number } =>
          Boolean(school.latitude && school.longitude),
        )
        .map((school) => ({
          id: school.id,
          titulo: school.nomeOficial,
          latitude: school.latitude,
          longitude: school.longitude,
        })),
    [data],
  );

  const filtros = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select value={tipo} onChange={(event) => setTipo(event.target.value as SchoolType | "")}>
        <option value="">Todos os tipos</option>
        {Object.entries(SCHOOL_TYPE_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select value={turno} onChange={(event) => setTurno(event.target.value as SchoolShift | "")}>
        <option value="">Todos os turnos</option>
        {Object.entries(SCHOOL_SHIFT_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Mapa de escolas</Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          {filtros}

          {isLoading || !data ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : markers.length === 0 ? (
            <Typography variant="bodySmall" color="muted">
              Nenhuma escola com coordenadas conhecidas para os filtros selecionados.
            </Typography>
          ) : (
            <div style={{ height: 560 }}>
              <RottaMap
                markers={markers}
                onMarkerPress={(marker) => router.push(`/escolas/${marker.id}`)}
              />
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
