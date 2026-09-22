"use client";

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Input,
  StatTile,
  Table,
  Typography,
} from "@rotta/ui/web";
import { useMemo, useState } from "react";

import type { AlunoDoDia, StatusDoAlunoNoDia, SchoolShift } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import { useAlunosDoDia } from "@/features/school-portal/hooks/use-school-portal";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";

/**
 * Portal da Escola (pedido do usuário 22/09/2026: "criar a categoria de
 * escolas, que aí vão poder ver quais alunos irão nos ônibus e se eles
 * já foram, para maior controle").
 *
 * Esta é a tela do PORTÃO, na hora da saída — e todas as decisões de
 * layout vêm daí:
 *
 *  - **AGUARDANDO vem primeiro**, sempre. É a única linha que exige
 *    ação de quem está lendo: é a criança que ainda está na escola. Os
 *    três contadores no topo dizem em um relance quantas ainda faltam.
 *  - **A placa é coluna própria**, porque é o que a inspetora confere
 *    antes de liberar a criança para o ônibus.
 *  - **A transportadora aparece em cada linha**, porque a mesma escola
 *    costuma ser atendida por várias — sem isso, quando uma criança não
 *    aparece, não dá para saber a quem ligar.
 *  - **Nada aqui escreve.** A escola confere e cobra; quem registra
 *    embarque e desembarque continua sendo o motorista/monitor dentro
 *    do veículo, que é quem de fato vê a criança subir.
 *
 * A lista se atualiza sozinha a cada 15s (`useAlunosDoDia`) — ninguém
 * vai apertar F5 segurando um portão aberto.
 */
export default function MinhaEscolaPage(): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useAlunosDoDia();
  const [busca, setBusca] = useState("");

  const alunos = useMemo(() => ordenarPelaUrgencia(data ?? [], busca), [data, busca]);
  const contagem = useMemo(() => contar(data ?? []), [data]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Minha Escola</Typography>
        <Typography variant="bodySmall" color="muted">
          Quem vai de ônibus hoje e em que pé está cada um. A lista se atualiza sozinha.
        </Typography>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Ainda na escola" value={String(contagem.aguardando)} />
        <StatTile label="No ônibus agora" value={String(contagem.embarcados)} />
        <StatTile label="Já desembarcaram" value={String(contagem.desembarcaram)} />
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar pelo nome do aluno"
            aria-label="Buscar pelo nome do aluno"
          />

          {isLoading ? (
            <Typography variant="body" color="muted">
              Carregando a lista de hoje…
            </Typography>
          ) : isError ? (
            <ErrorState
              message="Não foi possível carregar os alunos de hoje."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : alunos.length === 0 ? (
            <EmptyState
              title={busca ? "Nenhum aluno com esse nome" : "Nenhum aluno de ônibus hoje"}
              description={
                busca
                  ? "Confira a grafia ou limpe a busca para ver a lista inteira."
                  : "Assim que uma transportadora vincular alunos desta escola a uma rota, eles aparecem aqui."
              }
            />
          ) : (
            <Table<AlunoDoDia>
              columns={[
                {
                  key: "nome",
                  header: "Aluno",
                  render: (aluno) => (
                    <span className="flex flex-col">
                      <span className="font-medium text-text">{aluno.nome}</span>
                      <span className="text-xs text-text-muted">
                        {formatarNascimento(aluno.dataNascimento)}
                      </span>
                    </span>
                  ),
                },
                {
                  key: "turno",
                  header: "Turno",
                  render: (aluno) => SCHOOL_SHIFT_LABEL[aluno.turno as SchoolShift] ?? aluno.turno,
                },
                {
                  key: "status",
                  header: "Situação",
                  render: (aluno) => (
                    <span className="flex flex-col gap-1">
                      <Badge variant={STATUS_VARIANT[aluno.status]}>
                        {STATUS_LABEL[aluno.status]}
                      </Badge>
                      {aluno.ocorridoEm ? (
                        <span className="text-xs text-text-muted">
                          {formatarHora(aluno.ocorridoEm)}
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: "veiculo",
                  header: "Ônibus",
                  render: (aluno) =>
                    aluno.veiculoPlaca ? (
                      <span className="flex flex-col">
                        <span className="font-medium text-text">{aluno.veiculoPlaca}</span>
                        <span className="text-xs text-text-muted">{aluno.veiculoModelo}</span>
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    ),
                },
                {
                  key: "rota",
                  header: "Rota",
                  render: (aluno) => aluno.rotaNome ?? "—",
                },
                {
                  key: "transportadora",
                  header: "Transportadora",
                  render: (aluno) => aluno.transportadoraNome ?? "—",
                },
              ]}
              rows={alunos}
              keyExtractor={(aluno) => aluno.studentId}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

const STATUS_LABEL: Record<StatusDoAlunoNoDia, string> = {
  AGUARDANDO: "Ainda na escola",
  EMBARCADO: "No ônibus",
  DESEMBARCOU: "Desembarcou",
  AUSENTE: "Faltou",
};

const STATUS_VARIANT: Record<StatusDoAlunoNoDia, BadgeVariant> = {
  // Amarelo, não vermelho: "ainda na escola" é o estado NORMAL antes da
  // saída, não um erro. Vermelho aqui faria a tela inteira gritar às
  // 7h da manhã, e ninguém olharia mais para ela às 11h.
  AGUARDANDO: "warning",
  EMBARCADO: "info",
  DESEMBARCOU: "success",
  AUSENTE: "neutral",
};

/**
 * A ordem da lista é a ordem da urgência de quem está no portão: quem
 * ainda não embarcou primeiro, quem já desembarcou por último. Dentro
 * de cada grupo, ordem alfabética (o backend já entrega assim).
 */
const PESO_DO_STATUS: Record<StatusDoAlunoNoDia, number> = {
  AGUARDANDO: 0,
  EMBARCADO: 1,
  DESEMBARCOU: 2,
  AUSENTE: 3,
};

function ordenarPelaUrgencia(alunos: AlunoDoDia[], busca: string): AlunoDoDia[] {
  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? alunos.filter((aluno) => aluno.nome.toLowerCase().includes(termo))
    : alunos;

  return [...filtrados].sort(
    (a, b) =>
      PESO_DO_STATUS[a.status] - PESO_DO_STATUS[b.status] || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

function contar(alunos: AlunoDoDia[]): {
  aguardando: number;
  embarcados: number;
  desembarcaram: number;
} {
  return {
    aguardando: alunos.filter((aluno) => aluno.status === "AGUARDANDO").length,
    embarcados: alunos.filter((aluno) => aluno.status === "EMBARCADO").length,
    desembarcaram: alunos.filter((aluno) => aluno.status === "DESEMBARCOU").length,
  };
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, sem `new Date` (que aplicaria fuso a uma data sem hora). */
function formatarNascimento(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
