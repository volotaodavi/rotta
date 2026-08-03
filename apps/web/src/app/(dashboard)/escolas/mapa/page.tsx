"use client";

import { Card, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { School, SchoolShift, SchoolType } from "@rotta/api-client";

import { SchoolStatusBadge } from "@/features/schools/components/school-status-badge";
import { useSchoolsList } from "@/features/schools/hooks/use-schools";
import { SCHOOL_SHIFT_LABEL, SCHOOL_TYPE_LABEL } from "@/features/schools/labels";


/**
 * "Mapa" (briefing "MAPA" — "exibir todas as escolas, permitir
 * filtros, agrupar por cidade"). `packages/maps` ainda é um stub vazio
 * (mesma decisão de escopo de `/veiculos/mapa`) — esta tela já
 * implementa os filtros reais e agrupa por cidade/UF em formato
 * tabular; o mapa interativo substitui esta tabela assim que o
 * provedor de mapas for contratado.
 */
export default function EscolasMapaPage(): JSX.Element {
  const [tipo, setTipo] = useState<SchoolType | "">("");
  const [turno, setTurno] = useState<SchoolShift | "">("");

  const { data, isLoading } = useSchoolsList({
    tipo: tipo || undefined,
    turno: turno || undefined,
    pageSize: 100,
    sortBy: "cidade",
    sortOrder: "asc",
  });

  const groups = groupByCity(data?.items ?? []);

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Mapa de escolas</Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            Mapa interativo em preparação — nenhum provedor de mapas (Google Maps/Mapbox) está
            configurado ainda. Esta lista mostra as escolas agrupadas por cidade/UF, com suas
            coordenadas conhecidas.
          </Typography>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as SchoolType | "")}
            >
              <option value="">Todos os tipos</option>
              {Object.entries(SCHOOL_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={turno}
              onChange={(event) => setTurno(event.target.value as SchoolShift | "")}
            >
              <option value="">Todos os turnos</option>
              {Object.entries(SCHOOL_SHIFT_LABEL).map(([value, label]) => (
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
            <div className="flex flex-col gap-6">
              {Object.entries(groups).map(([cidadeUf, schools]) => (
                <div key={cidadeUf} className="flex flex-col gap-2">
                  <Typography variant="subtitle">
                    {cidadeUf} ({schools.length})
                  </Typography>
                  <Table<School>
                    columns={[
                      { key: "nome", header: "Nome", render: (s) => s.nomeOficial },
                      {
                        key: "status",
                        header: "Status",
                        render: (s) => <SchoolStatusBadge status={s.status} />,
                      },
                      {
                        key: "posicao",
                        header: "Coordenadas",
                        render: (s) =>
                          s.latitude && s.longitude
                            ? `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`
                            : "Sem coordenadas registradas",
                      },
                    ]}
                    rows={schools}
                    keyExtractor={(s) => s.id}
                    onRowClick={(s) => {
                      window.location.href = `/escolas/${s.id}`;
                    }}
                  />
                </div>
              ))}
              {Object.keys(groups).length === 0 && (
                <Typography variant="bodySmall" color="muted">
                  Nenhuma escola encontrada com os filtros selecionados.
                </Typography>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

function groupByCity(schools: School[]): Record<string, School[]> {
  return schools.reduce<Record<string, School[]>>((groups, school) => {
    const key = `${school.cidade}/${school.estado}`;
    (groups[key] ??= []).push(school);
    return groups;
  }, {});
}
