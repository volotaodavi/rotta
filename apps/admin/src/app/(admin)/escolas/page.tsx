"use client";

import { GraduationCap, RefreshCw } from "@rotta/icons";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Select,
  Table,
  TableSkeleton,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type { ListSchoolsParams, School, SchoolStatus, SchoolType } from "@rotta/api-client";

import { SchoolStatusBadge } from "@/features/schools/components/school-status-badge";
import {
  useBulkUpdateSchoolStatus,
  useInepSyncStatus,
  useSchoolDashboard,
  useSchoolsList,
  useSyncInep,
} from "@/features/schools/hooks/use-schools";
import { SCHOOL_TYPE_LABEL } from "@/features/schools/labels";

/** Legenda curta de quando a última sincronização rodou — "há poucos segundos" é mais legível que um timestamp cru enquanto o worker ainda está rodando. */
function formatarQuandoRodou(iso: string): string {
  const segundos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return "há poucos segundos";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  return new Date(iso).toLocaleString("pt-BR");
}

/** Censo Escolar (INEP) publica dados do ano anterior — mesmo default de `InepSyncSchedulerService`. */
const ANO_PADRAO_CENSO = new Date().getFullYear() - 1;

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
  const [anoSync, setAnoSync] = useState(ANO_PADRAO_CENSO);
  const pageSize = 20;

  const syncInep = useSyncInep();
  const { data: inepStatus } = useInepSyncStatus();
  const bulkUpdateStatus = useBulkUpdateSchoolStatus();

  // Só pra mostrar "quantas escolas isso afeta" no botão/confirmação
  // abaixo — não tem relação com os filtros que o usuário escolheu na
  // tabela (aquele `params` é sobre o que É EXIBIDO; este é sobre o que
  // SERIA ativado, sempre EM_ANALISE, sempre o catálogo inteiro).
  const { data: emAnaliseCount } = useSchoolsList({
    status: "EM_ANALISE",
    page: 1,
    pageSize: 1,
  });

  const params: ListSchoolsParams = {
    search: search || undefined,
    status: status || undefined,
    tipo: tipo || undefined,
    companyId: companyId || undefined,
    page,
    pageSize,
  };

  const { data: dashboard } = useSchoolDashboard(companyId || undefined);
  const { data, isLoading, isError, refetch, isFetching } = useSchoolsList(params);

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Escolas</Typography>
      <Typography variant="bodySmall" color="muted">
        Catálogo compartilhado de escolas atendidas por todas as empresas da plataforma.
      </Typography>

      {/*
        Education Sync Agent (Dossiê 14) — sem clicar aqui pelo menos
        uma vez, este catálogo fica vazio pra SEMPRE (não há cron
        automático a menos que `INEP_SYNC_CRON` esteja configurado no
        Render). "Nenhuma escola encontrada" na tabela abaixo, ANTES de
        rodar isso, não é um bug — é o estado inicial honesto.
      */}
      <Card>
        <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="bodySmall" className="font-semibold">
              Sincronização INEP (Censo Escolar)
            </Typography>
            <Typography variant="caption" color="muted">
              Importa/atualiza o catálogo nacional de escolas. Roda em segundo plano: o resultado
              aparece abaixo automaticamente assim que o worker terminar (atualiza sozinho a cada
              15s).
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={anoSync}
              onChange={(event) => setAnoSync(Number(event.target.value))}
              className="w-28"
              aria-label="Ano do Censo Escolar"
            />
            <Button
              variant="secondary"
              onClick={() => syncInep.mutate(anoSync)}
              isLoading={syncInep.isPending}
            >
              <RefreshCw size={16} />
              Sincronizar agora
            </Button>
          </div>
        </Card.Body>
        {syncInep.isSuccess && (
          <Card.Body className="pt-0">
            <Typography variant="bodySmall" color="success">
              Sincronização de {syncInep.data.ano} publicada na fila (mensagem{" "}
              {syncInep.data.messageId}).
            </Typography>
          </Card.Body>
        )}
        {syncInep.isError && (
          <Card.Body className="pt-0">
            <Typography variant="bodySmall" color="danger">
              Não foi possível publicar a sincronização. Tente novamente.
            </Typography>
          </Card.Body>
        )}
        {/*
          Status da ÚLTIMA execução (`GET /geo/inep-sync/status`) — nunca
          confundir com o `syncInep.isSuccess` acima: aquele confirma só
          que o job foi PUBLICADO na fila; isto mostra o resultado real
          depois que o worker rodou (pode ser de um clique anterior, ou
          do cron automático — `useInepSyncStatus` faz polling sozinho).
        */}
        {inepStatus === null ? (
          <Card.Body className="pt-0">
            <Typography variant="caption" color="muted">
              Nenhuma sincronização registrada neste ambiente ainda.
            </Typography>
          </Card.Body>
        ) : inepStatus ? (
          <Card.Body className="flex flex-col gap-1 pt-0">
            <Typography variant="bodySmall" color={inepStatus.sucesso ? "success" : "danger"}>
              Última sincronização (Censo {inepStatus.ano},{" "}
              {formatarQuandoRodou(inepStatus.executadoEm)}):{" "}
              {inepStatus.sucesso
                ? `${inepStatus.resumo?.novas ?? 0} novas, ${inepStatus.resumo?.atualizadas ?? 0} atualizadas, ${inepStatus.resumo?.inalteradas ?? 0} inalteradas${
                    inepStatus.resumo && inepStatus.resumo.erros.length > 0
                      ? `, ${inepStatus.resumo.erros.length} erros de linha`
                      : ""
                  }.`
                : `falhou: ${inepStatus.erro}`}
            </Typography>
          </Card.Body>
        ) : null}
      </Card>

      {/*
        Pedido do usuário: "as escolas que estiverem com o status de 'em
        análise', passe todas as escolas para 'ativa'". Um único
        `PATCH /schools/status/bulk` (nunca um clique por escola — o
        catálogo importado do INEP passa de 150 mil linhas). Continua
        valendo pra qualquer nova leva `EM_ANALISE` que entrar depois
        (nova sincronização INEP, autocadastro do Responsável): o botão
        fica disponível pra rodar de novo quando fizer sentido.
      */}
      {(emAnaliseCount?.total ?? 0) > 0 && (
        <Card>
          <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="bodySmall" className="font-semibold">
                {emAnaliseCount?.total.toLocaleString("pt-BR")} escolas aguardando revisão
              </Typography>
              <Typography variant="caption" color="muted">
                Status &quot;Em análise&quot;: dado de origem externa/lote (importação/sincronização
                INEP) que ainda não foi confirmado manualmente.
              </Typography>
            </div>
            <Button
              variant="secondary"
              isLoading={bulkUpdateStatus.isPending}
              onClick={() => {
                const quantidade = emAnaliseCount?.total ?? 0;
                const confirmado = window.confirm(
                  `Ativar TODAS as ${quantidade.toLocaleString("pt-BR")} escolas com status "Em análise"? Elas passam a aparecer em buscas e no mapa imediatamente.`,
                );
                if (!confirmado) return;
                bulkUpdateStatus.mutate({ fromStatus: "EM_ANALISE", toStatus: "ATIVA" });
              }}
            >
              Ativar todas em análise
            </Button>
          </Card.Body>
          {bulkUpdateStatus.isSuccess && (
            <Card.Body className="pt-0">
              <Typography variant="bodySmall" color="success">
                {bulkUpdateStatus.data.quantidadeAtualizada.toLocaleString("pt-BR")} escolas
                ativadas.
              </Typography>
            </Card.Body>
          )}
          {bulkUpdateStatus.isError && (
            <Card.Body className="pt-0">
              <Typography variant="bodySmall" color="danger">
                Não foi possível ativar as escolas. Tente novamente.
              </Typography>
            </Card.Body>
          )}
        </Card>
      )}

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
            <TableSkeleton columns={5} />
          ) : isError ? (
            <ErrorState
              message="Não foi possível carregar as escolas."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Nenhuma escola encontrada."
              description="Ajuste os filtros acima, ou rode a sincronização INEP se o catálogo ainda estiver vazio."
            />
          ) : (
            data && (
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
