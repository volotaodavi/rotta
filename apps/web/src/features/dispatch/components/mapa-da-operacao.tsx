"use client";

import { Badge, Card, EmptyState, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { VeiculoNoMapa } from "@rotta/api-client";
import type { RottaMapMarker } from "@rotta/maps/types";

import { RottaMapLazy } from "@/components/rotta-map-lazy";
import {
  SITUACAO_DO_VEICULO_COR,
  SITUACAO_DO_VEICULO_LABEL,
  SITUACAO_DO_VEICULO_VARIANT,
  horaDe,
} from "@/features/dispatch/labels";

/**
 * O mapa da operação, com a honestidade do sinal escrita na tela.
 *
 * ## A regra desta tela inteira
 *
 * **Posição velha aparece, mas nunca se chama tempo real.** O carro que
 * perdeu sinal continua no mapa, porque saber onde ele estava vale
 * muito; o que não pode é a tela deixar o despachante achar que é onde
 * ele está. Por isso o marcador de quem está sem sinal nasce com a
 * idade da última posição ao lado, e o painel lateral repete isso por
 * extenso.
 *
 * Isto é o mesmo defeito que já foi corrigido uma vez no mapa do
 * Responsável, e a correção não pode valer só lá.
 *
 * ## Por que os marcadores não se movem sozinhos entre atualizações
 *
 * Não há interpolação nem animação de trajeto. O marcador fica onde a
 * última posição real o colocou e salta quando chega a próxima. Uma
 * animação suave entre dois pontos é uma suposição sobre o caminho
 * percorrido, e no meio dela a tela estaria mostrando um lugar onde o
 * ônibus nunca esteve.
 */
export function MapaDaOperacao({
  veiculos,
  atualizadoEm,
}: {
  veiculos: VeiculoNoMapa[];
  atualizadoEm: string;
}): JSX.Element {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const comPosicao = veiculos.filter(
    (veiculo) => veiculo.latitude !== null && veiculo.longitude !== null,
  );
  const selecionado =
    veiculos.find((veiculo) => veiculo.tripId === selecionadoId) ?? comPosicao[0] ?? null;

  const marcadores: RottaMapMarker[] = comPosicao.map((veiculo) => ({
    id: veiculo.tripId,
    latitude: veiculo.latitude as number,
    longitude: veiculo.longitude as number,
    titulo: `${veiculo.identificacao} · ${veiculo.rotaNome}`,
    // Só quem está REALMENTE andando ganha o ícone de veículo em
    // movimento. Carro parado ou sem sinal com ícone de movimento seria
    // a mentira em forma de desenho.
    emMovimento: veiculo.situacao === "EM_MOVIMENTO",
  }));

  return (
    <Card className="overflow-hidden">
      <Card.Body className="flex flex-col gap-4 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <Typography variant="subtitle">Acompanhamento da operação</Typography>
            <Typography variant="caption" color="muted">
              Atualizado às {horaDe(atualizadoEm)}. A posição de cada carro é a última que o
              aparelho enviou, e a idade dela está escrita ao lado.
            </Typography>
          </div>
          <LegendaDoMapa />
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="h-[420px] w-full border-t border-border">
            {comPosicao.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                  title="Nenhum carro mandando posição agora"
                  description="O mapa mostra os ônibus com viagem aberta. Fora do horário de operação, ou com todos os rastreadores desligados, ele fica assim mesmo."
                />
              </div>
            ) : (
              <RottaMapLazy
                markers={marcadores}
                initialZoom={12}
                onMarkerPress={(marker) => setSelecionadoId(marker.id)}
              />
            )}
          </div>

          <aside className="flex max-h-[420px] flex-col border-t border-border lg:border-l">
            <div className="border-b border-border px-4 py-3">
              <Typography variant="caption" color="muted">
                {veiculos.length === 0
                  ? "Nenhuma viagem aberta"
                  : `${veiculos.length} ${veiculos.length === 1 ? "viagem aberta" : "viagens abertas"}`}
              </Typography>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {veiculos.map((veiculo) => (
                <li key={veiculo.tripId}>
                  <button
                    type="button"
                    onClick={() => setSelecionadoId(veiculo.tripId)}
                    aria-current={selecionado?.tripId === veiculo.tripId ? "true" : undefined}
                    className={`flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/10 ${
                      selecionado?.tripId === veiculo.tripId ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${SITUACAO_DO_VEICULO_COR[veiculo.situacao]}`}
                      />
                      <span className="font-semibold text-text">{veiculo.identificacao}</span>
                      <Badge variant={SITUACAO_DO_VEICULO_VARIANT[veiculo.situacao]}>
                        {SITUACAO_DO_VEICULO_LABEL[veiculo.situacao]}
                      </Badge>
                    </span>
                    <span className="text-sm text-text-muted">{veiculo.rotaNome}</span>
                    <span className="text-xs text-text-muted">{frescorDe(veiculo)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {selecionado ? <DetalheDoVeiculo veiculo={selecionado} /> : null}
      </Card.Body>
    </Card>
  );
}

/** A legenda. Existe porque cor sozinha não é informação acessível, e porque bolinha sem legenda vira adivinhação. */
function LegendaDoMapa(): JSX.Element {
  const itens = (["EM_MOVIMENTO", "PARADO", "SEM_SINAL", "SEM_RASTREADOR"] as const).map(
    (situacao) => ({ situacao, label: SITUACAO_DO_VEICULO_LABEL[situacao] }),
  );

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {itens.map((item) => (
        <li key={item.situacao} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${SITUACAO_DO_VEICULO_COR[item.situacao]}`}
          />
          <span className="text-xs text-text-muted">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A faixa de baixo: quem está dirigindo o carro selecionado e desde
 * quando ninguém sabe dele.
 *
 * O telefone do motorista não está aqui porque esta tela é de
 * acompanhamento, e um número de telefone no meio de um painel que
 * recarrega sozinho é um convite a ligar para a pessoa errada depois de
 * uma troca de escala. Quem precisa ligar abre a viagem.
 */
function DetalheDoVeiculo({ veiculo }: { veiculo: VeiculoNoMapa }): JSX.Element {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border bg-surface-elevated px-5 py-4">
      <dl className="grid flex-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Ônibus" valor={`${veiculo.identificacao} · ${veiculo.placa}`} />
        <Campo rotulo="Rota" valor={veiculo.rotaNome} />
        <Campo rotulo="Motorista" valor={veiculo.motoristaNome} />
        <Campo
          rotulo="Monitor"
          valor={veiculo.monitorNome ?? "Nenhum designado para esta viagem"}
        />
      </dl>
      <div className="flex flex-col items-start gap-1">
        <Badge variant={SITUACAO_DO_VEICULO_VARIANT[veiculo.situacao]}>
          {SITUACAO_DO_VEICULO_LABEL[veiculo.situacao]}
        </Badge>
        <Typography variant="caption" color="muted">
          {frescorDe(veiculo)}
        </Typography>
      </div>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{rotulo}</dt>
      <dd className="text-sm font-medium text-text">{valor}</dd>
    </div>
  );
}

/**
 * A frase que diz quando aquela posição foi capturada.
 *
 * É o coração da honestidade desta tela, por isso é uma função só, usada
 * nos dois lugares que mostram situação. "Agora" só aparece com menos
 * de um minuto; de resto é sempre um número, porque "há pouco" é o tipo
 * de frase que faz o despachante relaxar sem motivo.
 */
function frescorDe(veiculo: VeiculoNoMapa): string {
  if (veiculo.situacao === "SEM_RASTREADOR") {
    return "Este carro não tem rastreador vinculado";
  }
  if (veiculo.minutosDesdeAPosicao === null || veiculo.posicaoCapturadaEm === null) {
    return "Nenhuma posição recebida nesta viagem";
  }
  if (veiculo.minutosDesdeAPosicao < 1) {
    return `Posição de agora, às ${horaDe(veiculo.posicaoCapturadaEm)}`;
  }
  return `Última posição há ${veiculo.minutosDesdeAPosicao} min, às ${horaDe(veiculo.posicaoCapturadaEm)}`;
}
