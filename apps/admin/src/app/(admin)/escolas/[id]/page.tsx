"use client";

import { Badge, Card, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { use } from "react";

import type { SchoolAuditLog, SchoolStatus } from "@rotta/api-client";

import { SchoolStatusBadge } from "@/features/schools/components/school-status-badge";
import {
  useSchool,
  useSchoolAuditLogs,
  useSchoolCompanyLinks,
  useUpdateSchoolStatus,
} from "@/features/schools/hooks/use-schools";
import {
  SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL,
  SCHOOL_TYPE_LABEL,
} from "@/features/schools/labels";

const STATUS_OPTIONS: SchoolStatus[] = ["ATIVA", "INATIVA", "EM_ANALISE", "ARQUIVADA"];

/**
 * Detalhes de uma escola — visão de MODERAÇÃO do Admin Rotta sobre o
 * catálogo compartilhado (mesmo espírito de `/veiculos/[id]`): dados
 * básicos, troca de status (moderação — ex. arquivar duplicata ou
 * marcar "Em análise"), TODAS as empresas atualmente vinculadas
 * (diferencial exclusivo desta tela — só o Admin Rotta vê o catálogo
 * cross-tenant completo de vínculos) e o log de auditoria.
 */
export default function EscolaAdminDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const { data: school, isLoading, isError } = useSchool(id);
  const { data: links } = useSchoolCompanyLinks(id);
  const { data: auditLogs } = useSchoolAuditLogs(id);
  const updateStatus = useUpdateSchoolStatus(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !school) {
    return (
      <Typography variant="body" color="danger">
        Não foi possível carregar esta escola.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Typography variant="title">{school.nomeOficial}</Typography>
            <SchoolStatusBadge status={school.status} />
          </div>
          <Typography variant="caption" color="muted">
            Código interno: {school.codigoInterno}
            {school.codigoInep ? ` · Código INEP: ${school.codigoInep}` : ""} · Origem:{" "}
            {school.origemCadastro}
          </Typography>
        </div>

        <Select
          value={school.status}
          disabled={updateStatus.isPending}
          onChange={(event) => updateStatus.mutate(event.target.value as SchoolStatus)}
        >
          {STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Card.Header
          title="Dados da escola"
          action={
            <Badge variant="neutral">
              {SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL[school.dependenciaAdministrativa]}
            </Badge>
          }
        />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoItem label="Nome fantasia" value={school.nomeFantasia ?? "Não informado"} />
          <InfoItem label="Rede de ensino" value={school.redeEnsino ?? "Não informado"} />
          <InfoItem
            label="Tipos"
            value={school.tipos.map((t) => SCHOOL_TYPE_LABEL[t]).join(", ")}
          />
          <InfoItem label="CNPJ" value={school.cnpj ?? "Não informado"} />
          <InfoItem label="Telefone" value={school.telefone ?? "Não informado"} />
          <InfoItem label="E-mail" value={school.email ?? "Não informado"} />
          <InfoItem
            label="Endereço"
            value={`${school.logradouro}, ${school.numero} — ${school.bairro}, ${school.cidade}/${school.estado}`}
          />
          <InfoItem label="CEP" value={school.cep} />
          <InfoItem
            label="Coordenadas"
            value={
              school.latitude && school.longitude
                ? `${school.latitude}, ${school.longitude}`
                : "Sem coordenadas registradas"
            }
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Empresas vinculadas (catálogo compartilhado)" />
        <Card.Body>
          <Typography variant="bodySmall" color="muted" className="mb-3">
            Todas as empresas que já atenderam ou atendem esta escola — visível apenas ao Admin
            Rotta, já que cada Empresa só enxerga seu próprio vínculo.
          </Typography>
          <Table
            columns={[
              {
                key: "companyId",
                header: "Empresa (ID)",
                render: (link) => <span className="font-mono text-xs">{link.companyId}</span>,
              },
              {
                key: "vinculadoEm",
                header: "Vinculado em",
                render: (link) => new Date(link.vinculadoEm).toLocaleDateString("pt-BR"),
              },
              {
                key: "status",
                header: "Status",
                render: (link) => (link.desvinculadoEm ? "Encerrado" : "Ativo"),
              },
            ]}
            rows={links?.items ?? []}
            keyExtractor={(link) => link.id}
            emptyMessage="Nenhuma empresa vinculada a esta escola."
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Auditoria" />
        <Card.Body>
          <Table<SchoolAuditLog>
            columns={[
              { key: "acao", header: "Ação", render: (log) => log.acao },
              {
                key: "ator",
                header: "Autor (ID)",
                render: (log) => (
                  <span className="font-mono text-xs">{log.atorUserId ?? "Não informado"}</span>
                ),
              },
              {
                key: "data",
                header: "Data",
                render: (log) => new Date(log.createdAt).toLocaleString("pt-BR"),
              },
            ]}
            rows={auditLogs?.items ?? []}
            keyExtractor={(log) => log.id}
            emptyMessage="Nenhum registro de auditoria para esta escola."
          />
        </Card.Body>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </div>
  );
}
