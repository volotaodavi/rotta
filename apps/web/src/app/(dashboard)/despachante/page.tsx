"use client";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Select,
  Spinner,
  Typography,
  useToast,
} from "@rotta/ui/web";
import { useState } from "react";

import type { Route, Vehicle } from "@rotta/api-client";

import {
  useBuscaDeVeiculos,
  useFrotaParaSubstituicao,
  useRotasDoVeiculo,
  useTrocarOnibusDeHoje,
  useTrocarOnibusPadrao,
  useViagemDeHoje,
} from "@/features/dispatch/hooks/use-dispatch";
import { ROUTE_STATUS_LABEL, ROUTE_STATUS_VARIANT } from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";

/**
 * Painel do Despachante (pedido do usuário 22/09/2026: "colocando um
 * painel para a transportadora poder alterar a Rota através do número
 * cadastrado pelo ônibus... o despachante altera conforme o rodízio...
 * e os responsáveis sempre atualizados").
 *
 * ## A ideia inteira da tela
 *
 * Toda outra tela da Rotta começa na ROTA. Esta começa no ÔNIBUS,
 * porque é assim que o problema chega para quem despacha: "o 412
 * quebrou", "o 118 vai para a oficina hoje". Ninguém liga para dizer o
 * nome da rota. Por isso a busca é pelo NÚMERO do ônibus (e também
 * placa/modelo, para a frota privada que não usa numeração) e, a
 * partir do carro, a tela mostra as rotas que ele atende hoje.
 *
 * ## As duas trocas são coisas diferentes, e a tela não deixa confundir
 *
 * Este é o ponto de cuidado da tela inteira, e o motivo de as duas
 * ações NUNCA aparecerem no mesmo botão:
 *
 *  - **Trocar o ônibus de hoje** mexe na viagem que já está rodando.
 *    Dispara `VEICULO_ALTERADO` para os responsáveis de todos os alunos
 *    da rota — e esse evento é PUSH, chega no celular na hora. Vale só
 *    hoje; amanhã a rota volta ao carro de sempre.
 *  - **Trocar o ônibus padrão** é o rodízio planejado. Passa a valer da
 *    próxima viagem em diante e NÃO notifica ninguém — porque o carro
 *    de hoje não mudou, e avisar "o veículo mudou" enquanto a criança
 *    está dentro do carro antigo seria informação falsa na pior hora
 *    possível.
 *
 * A tela escreve essa diferença ao lado de cada botão, em português,
 * toda vez. Quem despacha faz isso correndo, no meio de um telefonema.
 *
 * ## Por que tudo em uma página estática
 *
 * Nenhuma navegação para segmento dinâmico (`/despachante/[id]`) — o
 * bug do App Router do Next.js documentado em `rotas/page.tsx`
 * (renderização indeterminística de segmento dinâmico recém-criado, já
 * reproduzido ao vivo em produção três vezes) não pode alcançar uma
 * tela que a operação usa com a viagem em andamento. Tudo aqui troca
 * por estado local.
 */
export default function DespachantePage(): JSX.Element {
  const [termo, setTermo] = useState("");
  const [veiculo, setVeiculo] = useState<Vehicle | null>(null);

  const busca = useBuscaDeVeiculos(termo);
  const rotas = useRotasDoVeiculo(veiculo?.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Despachante</Typography>
        <Typography variant="bodySmall" color="muted">
          Busque o ônibus pelo número e altere a rota dele. A troca de hoje avisa os responsáveis na
          hora; a troca do padrão vale a partir da próxima viagem.
        </Typography>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <FormField
            label="Ônibus"
            helperText="Número do ônibus, placa ou modelo — a partir de 2 caracteres a busca começa sozinha."
          >
            <Input
              value={termo}
              onChange={(event) => {
                setTermo(event.target.value);
                setVeiculo(null);
              }}
              placeholder="412"
            />
          </FormField>

          {termo.trim().length >= 2 && !veiculo ? (
            busca.isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : busca.isError ? (
              <ErrorState
                message="Não foi possível buscar os ônibus."
                onRetry={() => void busca.refetch()}
                isRetrying={busca.isFetching}
              />
            ) : (busca.data?.items.length ?? 0) === 0 ? (
              <Typography variant="body" color="muted">
                Nenhum ônibus com esse número, placa ou modelo.
              </Typography>
            ) : (
              <ul className="flex flex-col gap-2">
                {busca.data?.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setVeiculo(item)}
                      className="flex w-full items-center justify-between gap-4 rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-secondary/10"
                    >
                      <span className="flex flex-col">
                        <span className="font-semibold text-text">{identificar(item)}</span>
                        <span className="text-sm text-text-muted">
                          {item.modelo} · {item.capacidadePassageiros} lugares
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {item.rastreadorImei ? (
                          <Badge variant="success">Rastreador</Badge>
                        ) : (
                          <Badge variant="neutral">Sem rastreador</Badge>
                        )}
                        {item.viagemAtualId ? <Badge variant="info">Em viagem</Badge> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </Card.Body>
      </Card>

      {veiculo ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Typography variant="subtitle">
              Rotas do {identificar(veiculo)} ({veiculo.modelo})
            </Typography>
            <Button variant="ghost" size="sm" onClick={() => setVeiculo(null)}>
              Trocar de ônibus
            </Button>
          </div>

          {rotas.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : rotas.isError ? (
            <ErrorState
              message="Não foi possível carregar as rotas deste ônibus."
              onRetry={() => void rotas.refetch()}
              isRetrying={rotas.isFetching}
            />
          ) : (rotas.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="Nenhuma rota usa este ônibus como padrão"
              description="Para pôr este carro numa rota, abra a rota em Rotas e defina o veículo padrão — ou troque o ônibus de hoje a partir do carro que está na rota."
            />
          ) : (
            rotas.data?.items.map((rota) => (
              <RotaDoDespachante key={rota.id} rota={rota} veiculoAtual={veiculo} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Como o despachante chama este ônibus.
 *
 * No transporte público é o NÚMERO ("o 412"), e a placa vira detalhe —
 * ninguém decora placa. Na frota privada não há número, então a placa
 * volta a ser a identidade. Uma função só, usada em todo lugar da tela,
 * para os dois públicos nunca verem rótulos diferentes do mesmo carro.
 */
function identificar(veiculo: Vehicle): string {
  return veiculo.numeroFrota ? `Ônibus ${veiculo.numeroFrota}` : veiculo.placa;
}

/**
 * Uma rota atendida pelo ônibus buscado, com as duas trocas possíveis.
 *
 * Cada rota tem o próprio card e o próprio seletor de substituto —
 * deliberadamente, em vez de um seletor único no topo: duas rotas do
 * mesmo carro podem precisar de substitutos DIFERENTES (uma de manhã,
 * outra à tarde), e um seletor compartilhado convidaria ao erro de
 * mandar as duas para o mesmo lugar sem perceber.
 */
function RotaDoDespachante({
  rota,
  veiculoAtual,
}: {
  rota: Route;
  veiculoAtual: Vehicle;
}): JSX.Element {
  const toast = useToast();
  const viagem = useViagemDeHoje(rota.id);
  const frota = useFrotaParaSubstituicao();
  const trocarHoje = useTrocarOnibusDeHoje();
  const trocarPadrao = useTrocarOnibusPadrao();

  const [substitutoId, setSubstitutoId] = useState("");
  const [motivo, setMotivo] = useState("");

  const tripDeHoje = viagem.data;
  // Só faz sentido trocar o carro de uma viagem que ainda vai rodar ou
  // está rodando. Numa viagem finalizada/cancelada a troca não muda
  // nada no mundo real e só geraria um push confuso para as famílias.
  const viagemTrocavel = tripDeHoje?.status === "EM_ANDAMENTO" || tripDeHoje?.status === "PAUSADA";

  const substitutos = (frota.data?.items ?? []).filter((item) => item.id !== veiculoAtual.id);
  const substituto = substitutos.find((item) => item.id === substitutoId);
  const nomeDoSubstituto = substituto ? identificar(substituto) : "o ônibus escolhido";

  return (
    <Card>
      <Card.Body className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Typography variant="subtitle">{rota.nome}</Typography>
            <Typography variant="bodySmall" color="muted">
              Turno {SCHOOL_SHIFT_LABEL[rota.turno]}
            </Typography>
          </div>
          <Badge variant={ROUTE_STATUS_VARIANT[rota.status]}>
            {ROUTE_STATUS_LABEL[rota.status]}
          </Badge>
        </div>

        <div className="rounded-md bg-secondary/10 px-4 py-3">
          {viagem.isLoading ? (
            <Typography variant="bodySmall" color="muted">
              Verificando a viagem de hoje…
            </Typography>
          ) : viagemTrocavel ? (
            <Typography variant="bodySmall">
              Viagem de hoje <strong>{tripDeHoje?.codigo}</strong> em andamento
              {tripDeHoje?.status === "PAUSADA" ? " (pausada)" : ""}.
            </Typography>
          ) : tripDeHoje ? (
            <Typography variant="bodySmall" color="muted">
              A viagem de hoje já foi encerrada — só dá para mexer no ônibus padrão.
            </Typography>
          ) : (
            <Typography variant="bodySmall" color="muted">
              Nenhuma viagem iniciada hoje nesta rota.
            </Typography>
          )}
        </div>

        <FormField label="Ônibus substituto">
          <Select
            value={substitutoId}
            onChange={(event) => setSubstitutoId(event.target.value)}
            disabled={frota.isLoading}
          >
            <option value="">Selecione o ônibus</option>
            {substitutos.map((item) => (
              <option key={item.id} value={item.id}>
                {identificar(item)} — {item.modelo} ({item.capacidadePassageiros} lugares)
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <FormField
              label="Motivo (opcional)"
              helperText="Fica no histórico da viagem. Ex.: 'pane elétrica'."
            >
              <Input
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Pane elétrica"
              />
            </FormField>
            <Button
              variant="primary"
              disabled={!viagemTrocavel || !substitutoId || trocarHoje.isPending}
              onClick={() => {
                if (!tripDeHoje || !substitutoId) return;
                trocarHoje.mutate(
                  {
                    tripId: tripDeHoje.id,
                    veiculoId: substitutoId,
                    ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
                  },
                  {
                    onSuccess: () => {
                      setMotivo("");
                      setSubstitutoId("");
                      toast.success(
                        `A viagem de hoje passou para ${nomeDoSubstituto}. Os responsáveis já foram avisados.`,
                      );
                    },
                  },
                );
              }}
            >
              {trocarHoje.isPending ? "Trocando…" : "Trocar o ônibus de HOJE"}
            </Button>
            <Typography variant="caption" color="muted">
              Vale só para a viagem de hoje e <strong>avisa os responsáveis na hora</strong>, no
              celular. Amanhã a rota volta ao ônibus padrão.
            </Typography>
          </div>

          <div className="flex flex-col justify-end gap-3">
            <Button
              variant="secondary"
              disabled={!substitutoId || trocarPadrao.isPending}
              onClick={() => {
                if (!substitutoId) return;
                trocarPadrao.mutate(
                  { routeId: rota.id, veiculoId: substitutoId },
                  {
                    onSuccess: () => {
                      setSubstitutoId("");
                      toast.success(
                        `${rota.nome} passa a sair com ${nomeDoSubstituto} a partir da próxima viagem.`,
                      );
                    },
                  },
                );
              }}
            >
              {trocarPadrao.isPending ? "Trocando…" : "Trocar o ônibus PADRÃO da rota"}
            </Button>
            <Typography variant="caption" color="muted">
              Rodízio planejado: vale da <strong>próxima viagem</strong> em diante e{" "}
              <strong>não avisa ninguém agora</strong> — o carro de hoje não mudou.
            </Typography>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
