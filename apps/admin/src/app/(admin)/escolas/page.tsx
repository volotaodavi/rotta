"use client";

import { Card, Input, Pagination, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { ListSchoolsParams, School, SchoolStatus, SchoolType } from "@rotta/api-client";

import { SchoolStatusBadge } from "@/features/schools/components/school-status-badge";
import { useSchoolDashboard, useSchoolsList } from "@/features/schools/hooks/use-schools";
import { SCHOOL_TYPE_LABEL } from "@/features/schools/labels";


/**
 * Listagem de escolas — visão CROSS-TENANT do Admin Rotta sobre o
 * catálogo COMPARTILHADO (mesma decisão estrutural de `/veiculos`,
 * mas com um diferencial: aqui não é "todas as empresas têm suas
 * próprias escolas", é "há um único catálogo, e o Admin Rotta o
 * modera por completo" — daí não haver filtro de `companyId` por
 * padrão (sem ele, `School.list` já retorna o catálogo inteiro).
 * Sem "Nova escola": moderação é sobre o que Empresas/Gestores já
 * cadastraram, não uma tela de cadastro operacional.
 */
export default function EscolasAdminPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SchoolStatus | "">("");
  const [tipo, setTipo] = useState<SchoolType | "">("");
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params: ListSchoolsParams = {
    search: search || undefined,
    status: status || undefined,
    tipo: tipo || undefined,
    companyId: companyId || undefined,
    page,
    pageSize,
  };

  const { data: dashboard } = useSchoolDashboard(companyId || undefined);
  const { data, isLoading, isError } = useSchoolsList(params);

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Escolas</Typography>
      <Typography variant="bodySmall" color="muted">
        Catálogo compartilhado de escolas atendidas por todas as empresas da plataforma.
      </Typography>

      {dashboard && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total de escolas", value: dashboard.totalEscolas },
            { label: "Públicas", value: dashboard.escolasPublicas },
            { label: "Privadas", value: dashboard.escolasPrivadas },
            { label: "Alunos vinculados", value: dashboard.alunosVinculados },
            { label: "Rotas ativas", value: dashboard.rotasAtivas },
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

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input
              placeholder="Buscar por nome, código INEP ou código interno"
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
                setStatus(event.target.value as SchoolStatus | "");
              }}
            >
              <option value="">Todos os status</option>
              {(["ATIVA", "INATIVA", "EM_ANALISE", "ARQUIVADA"] as SchoolStatus[]).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Select
              value={tipo}
              onChange={(event) => {
                setPage(1);
                setTipo(event.target.value as SchoolType | "");
              }}
            >
              <option value="">Todos os tipos</option>
              {Object.entries(SCHOOL_TYPE_LABEL).map(([value, label]) => (
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
              Não foi possível carregar as escolas. Tente novamente.
            </Typography>
          ) : data && data.items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhuma escola encontrada.
            </Typography>
          ) : (
            data && (
              <>
                <Table<School>
                  columns={[
                    { key: "nome", header: "Nome", render: (school) => school.nomeOficial },
                    {
                      key: "codigoInep",
                      header: "Código INEP",
                      render: (school) => school.codigoInep ?? "—",
                    },
                    {
                      key: "cidade",
                      header: "Cidade/UF",
                      render: (school) => `${school.cidade}/${school.estado}`,
                    },
                    {
                      key: "origem",
                      header: "Origem",
                      render: (school) => school.origemCadastro,
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (school) => <SchoolStatusBadge status={school.status} />,
                    },
                  ]}
                  rows={data.items}
                  keyExtractor={(school) => school.id}
                  onRowClick={(school) => {
                    window.location.href = `/escolas/${school.id}`;
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
