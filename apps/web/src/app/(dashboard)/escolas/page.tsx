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
import { useRef, useState, type ChangeEvent } from "react";

import type {
  ListSchoolsParams,
  School,
  SchoolShift,
  SchoolStatus,
  SchoolType,
} from "@rotta/api-client";

import { SchoolStatusBadge } from "@/features/schools/components/school-status-badge";
import {
  useImportSchools,
  useSchoolDashboard,
  useSchoolsList,
} from "@/features/schools/hooks/use-schools";
import { SCHOOL_SHIFT_LABEL, SCHOOL_TYPE_LABEL } from "@/features/schools/labels";
import { schoolsApi } from "@/lib/api-client";

/**
 * Listagem + Dashboard de Escolas (briefing "Gestão de Escolas" —
 * seções "DASHBOARD" e "PESQUISA"/"FILTROS") — mesma decisão de escopo
 * de `/veiculos`: uma única tela combina os contadores e a listagem.
 * `School` é um catálogo COMPARTILHADO entre empresas (nunca "da minha
 * empresa" como `Vehicle`) — a listagem aqui já é implicitamente
 * restrita, no backend, às escolas vinculadas à empresa do usuário
 * autenticado quando ele não é Admin Rotta (ver `SchoolsService.list`).
 */
export default function EscolasPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SchoolStatus | "">("");
  const [tipo, setTipo] = useState<SchoolType | "">("");
  const [turno, setTurno] = useState<SchoolShift | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params: ListSchoolsParams = {
    search: search || undefined,
    status: status || undefined,
    tipo: tipo || undefined,
    turno: turno || undefined,
    page,
    pageSize,
  };

  const { data: dashboard } = useSchoolDashboard();
  const { data, isLoading } = useSchoolsList(params);
  const importSchools = useImportSchools();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFormat, setImportFormat] = useState<"csv" | "excel" | "json">("csv");
  const [importResultMessage, setImportResultMessage] = useState<string | null>(null);

  async function handleExport(format: "csv" | "excel" | "pdf"): Promise<void> {
    const blob = await schoolsApi.exportList({ ...params, page: 1, pageSize: 10_000, format });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `escolas.${format === "excel" ? "xlsx" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportResultMessage(null);
    importSchools.mutate(
      { format: importFormat, file },
      {
        onSuccess: (result) => {
          setImportResultMessage(
            `${result.importadas} de ${result.totalLinhas} linha(s) importada(s)` +
              (result.erros.length > 0 ? `, ${result.erros.length} erro(s).` : "."),
          );
        },
        onError: () => setImportResultMessage("Erro inesperado ao importar o arquivo."),
      },
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="title">Escolas</Typography>
        <div className="flex flex-wrap gap-2">
          <Link href="/escolas/mapa" className={buttonVariants({ variant: "secondary" })}>
            Mapa
          </Link>
          <Link href="/escolas/novo" className={buttonVariants({ variant: "primary" })}>
            Nova escola
          </Link>
        </div>
      </div>

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
            <Select
              value={turno}
              onChange={(event) => {
                setPage(1);
                setTurno(event.target.value as SchoolShift | "");
              }}
            >
              <option value="">Todos os turnos</option>
              {Object.entries(SCHOOL_SHIFT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Select
                value={importFormat}
                onChange={(event) =>
                  setImportFormat(event.target.value as "csv" | "excel" | "json")
                }
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="json">JSON</option>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                isLoading={importSchools.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                Importar arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={handleImportFile}
              />
              {importResultMessage && (
                <Typography variant="caption" color="muted">
                  {importResultMessage}
                </Typography>
              )}
            </div>
            <div className="flex gap-2">
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
          </div>

          {isLoading || !data ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <Table<School>
                columns={[
                  { key: "nome", header: "Nome", render: (school) => school.nomeOficial },
                  {
                    key: "codigoInep",
                    header: "Código INEP",
                    render: (school) => school.codigoInep ?? "Não informado",
                  },
                  {
                    key: "cidade",
                    header: "Cidade/UF",
                    render: (school) => `${school.cidade}/${school.estado}`,
                  },
                  {
                    key: "tipos",
                    header: "Tipos",
                    render: (school) => school.tipos.map((t) => SCHOOL_TYPE_LABEL[t]).join(", "),
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
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
