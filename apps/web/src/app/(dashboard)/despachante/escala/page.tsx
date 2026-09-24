"use client";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  Spinner,
  Table,
  Typography,
  useToast,
} from "@rotta/ui/web";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Escala, ListRoutesParams } from "@rotta/api-client";

import {
  useDefinirEscala,
  useEscalasDoDia,
  useRemoverEscala,
} from "@/features/dispatch/hooks/use-escalas";
import { useRoutesList } from "@/features/routes/hooks/use-routes";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useMyTeam } from "@/features/team/hooks/use-team";
import { useVehiclesList } from "@/features/vehicles/hooks/use-vehicles";

/**
 * Escala do dia (pedido do usuário 24/09/2026: "a cada dia que for
 * trabalhar, o despachante poderá designar os veículos para rotas,
 * colocando respectivamente os motoristas").
 *
 * ## A tela é uma grade de um dia só
 *
 * Não é um calendário. O despachante trabalha num dia por vez — o de
 * amanhã, quase sempre — e o que ele precisa ver é a lista de rotas com
 * quem vai fazer cada uma. Um calendário mensal esconderia justamente
 * isso atrás de mais cliques.
 *
 * ## Por que abre em AMANHÃ, e não hoje
 *
 * Escalar é planejar. Quando o despachante abre esta tela, o dia de
 * hoje já está rodando — mexer nele é outro gesto, que tem outra tela
 * (o Painel do Despachante troca o ônibus da viagem em andamento e
 * avisa os responsáveis). Aqui se monta o dia seguinte.
 *
 * ## O que a escala NÃO faz
 *
 * Não avisa ninguém. Escalar o ônibus 412 para amanhã não notifica
 * responsável nenhum, porque nada mudou para eles hoje — a viagem de
 * amanhã vai nascer certa. Notificação de troca só existe quando a
 * viagem JÁ saiu com outro carro.
 */
export default function EscalaPage(): JSX.Element {
  const toast = useToast();
  const [data, setData] = useState(amanha);

  const escalas = useEscalasDoDia(data);
  const definir = useDefinirEscala();
  const remover = useRemoverEscala();

  const params: ListRoutesParams = { page: 1, pageSize: 100, status: "ATIVA" };
  const { data: rotas } = useRoutesList(params);
  const { data: frota } = useVehiclesList({ page: 1, pageSize: 200 });
  const { data: equipe } = useMyTeam();

  const motoristas = useMemo(
    () => (equipe ?? []).filter((membro) => membro.papel === "motorista"),
    [equipe],
  );

  // Rotas que ainda não têm escala neste dia — são elas que o
  // despachante precisa resolver, e é por elas que a tela começa.
  const semEscala = useMemo(() => {
    const comEscala = new Set((escalas.data ?? []).map((e) => e.routeId));
    return (rotas?.items ?? []).filter((rota) => !comEscala.has(rota.id));
  }, [rotas, escalas.data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Typography variant="title">Escala do dia</Typography>
          <Typography variant="bodySmall" color="muted">
            Quem faz cada rota neste dia. Vence o veículo e o motorista padrão da rota — use quando
            o dia foge do combinado.
          </Typography>
        </div>
        <div className="flex items-end gap-2">
          <FormField label="Dia">
            <Input type="date" value={data} onChange={(event) => setData(event.target.value)} />
          </FormField>
          <Link href="/despachante">
            <Button variant="ghost" size="sm">
              Trocar ônibus de hoje →
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <Card.Header title={`Rotas designadas (${escalas.data?.length ?? 0})`} />
        <Card.Body>
          {escalas.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (escalas.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Nenhuma rota designada neste dia"
              description="Sem escala, cada rota sai com o veículo e o motorista padrão dela. Designe abaixo só o que foge do padrão."
            />
          ) : (
            <Table<Escala>
              columns={[
                {
                  key: "rota",
                  header: "Rota",
                  render: (escala) => (
                    <span className="flex flex-col">
                      <span className="font-medium text-text">{escala.rotaNome}</span>
                      <span className="text-xs text-text-muted">
                        {SCHOOL_SHIFT_LABEL[escala.rotaTurno as keyof typeof SCHOOL_SHIFT_LABEL] ??
                          escala.rotaTurno}
                      </span>
                    </span>
                  ),
                },
                {
                  key: "onibus",
                  header: "Ônibus",
                  render: (escala) => <Badge variant="info">{escala.veiculoIdentificacao}</Badge>,
                },
                { key: "motorista", header: "Motorista", render: (e) => e.motoristaNome },
                {
                  key: "monitor",
                  header: "Monitor",
                  render: (escala) => escala.monitorNome ?? "—",
                },
                {
                  key: "obs",
                  header: "Observação",
                  render: (escala) => escala.observacao ?? "—",
                },
                {
                  key: "acao",
                  header: "",
                  render: (escala) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={remover.isPending}
                      onClick={() =>
                        remover.mutate(escala.id, {
                          onSuccess: () =>
                            toast.success(
                              `${escala.rotaNome} volta ao veículo e motorista padrão neste dia.`,
                            ),
                        })
                      }
                    >
                      Remover
                    </Button>
                  ),
                },
              ]}
              rows={escalas.data ?? []}
              keyExtractor={(escala) => escala.id}
            />
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Designar uma rota" />
        <Card.Body className="flex flex-col gap-4">
          {semEscala.length === 0 && (rotas?.items.length ?? 0) > 0 ? (
            <Typography variant="bodySmall" color="muted">
              Todas as rotas ativas já estão designadas neste dia. Para trocar alguma, designe de
              novo — designar a mesma rota no mesmo dia edita a escala.
            </Typography>
          ) : null}
          <FormularioDeEscala
            data={data}
            rotas={rotas?.items ?? []}
            veiculos={frota?.items ?? []}
            motoristas={motoristas}
            isPending={definir.isPending}
            onDefinir={(input) =>
              definir.mutate(input, {
                onSuccess: (escala) =>
                  toast.success(
                    `${escala.rotaNome} sai com ${escala.veiculoIdentificacao} e ${escala.motoristaNome}.`,
                  ),
              })
            }
          />
        </Card.Body>
      </Card>
    </div>
  );
}

function FormularioDeEscala({
  data,
  rotas,
  veiculos,
  motoristas,
  isPending,
  onDefinir,
}: {
  data: string;
  rotas: { id: string; nome: string; turno: string }[];
  veiculos: { id: string; numeroFrota: string | null; placa: string; modelo: string }[];
  motoristas: { userId: string; nome: string }[];
  isPending: boolean;
  onDefinir: (input: {
    routeId: string;
    data: string;
    veiculoId: string;
    motoristaId: string;
    observacao?: string;
  }) => void;
}): JSX.Element {
  const [routeId, setRouteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [observacao, setObservacao] = useState("");

  const completo = Boolean(routeId && veiculoId && motoristaId);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FormField label="Rota" isRequired>
        <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
          <option value="">Selecione</option>
          {rotas.map((rota) => (
            <option key={rota.id} value={rota.id}>
              {rota.nome}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Ônibus" isRequired>
        <Select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
          <option value="">Selecione</option>
          {veiculos.map((veiculo) => (
            <option key={veiculo.id} value={veiculo.id}>
              {/* Número primeiro, placa como alternativa — mesma regra
                  do Painel do Despachante, para os dois públicos nunca
                  verem rótulos diferentes do mesmo carro. */}
              {veiculo.numeroFrota ?? veiculo.placa} — {veiculo.modelo}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Motorista" isRequired>
        <Select value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}>
          <option value="">Selecione</option>
          {motoristas.map((motorista) => (
            <option key={motorista.userId} value={motorista.userId}>
              {motorista.nome}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="flex flex-col gap-2">
        <FormField label="Observação">
          <Input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Cobrindo férias"
          />
        </FormField>
        <Button
          variant="primary"
          disabled={!completo || isPending}
          onClick={() => {
            onDefinir({
              routeId,
              data,
              veiculoId,
              motoristaId,
              ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
            });
            setRouteId("");
            setVeiculoId("");
            setMotoristaId("");
            setObservacao("");
          }}
        >
          {isPending ? "Designando…" : "Designar"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Abre em amanhã: escalar é planejar. O dia de hoje já está rodando, e
 * mexer nele é outro gesto, com outra tela.
 */
function amanha(): string {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  return data.toISOString().slice(0, 10);
}
