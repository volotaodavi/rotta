"use client";

import { ErrorState, Skeleton, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";

import { AlertasDoPainel } from "@/features/dispatch/components/alertas-do-painel";
import { EscalaDoDiaResumida } from "@/features/dispatch/components/escala-do-dia-resumida";
import { EventosRecentes } from "@/features/dispatch/components/eventos-recentes";
import { IndicadoresDoPainelGeral } from "@/features/dispatch/components/indicadores-do-painel";
import { MapaDaOperacao } from "@/features/dispatch/components/mapa-da-operacao";
import { RotasDoDia } from "@/features/dispatch/components/rotas-do-dia";
import { usePainelDoDespachante } from "@/features/dispatch/hooks/use-painel";
import { horaDe } from "@/features/dispatch/labels";

/**
 * Painel Geral do Despachante (26/10/2026).
 *
 * ## As cinco perguntas
 *
 * A tela existe para responder cinco perguntas sem o despachante
 * clicar em nada, e a disposição dos blocos é literalmente essa lista:
 *
 *  1. **Quais veículos estão em operação** — os indicadores do topo.
 *  2. **Onde eles estão** — o mapa, com a idade de cada posição.
 *  3. **Quais rotas estão em andamento** — a lista do lado direito do
 *     mapa, com a atrasada no topo.
 *  4. **Se as equipes estão completas** — a escala do dia, com monitor
 *     ausente escrito em laranja em vez de célula vazia.
 *  5. **O que precisa de intervenção** — os alertas, ordenados por
 *     gravidade.
 *
 * ## Por que tudo aqui é leitura
 *
 * Nenhum botão desta página escreve. As duas escritas da operação têm
 * tela própria e continuam lá: `/despachante/trocar` para trocar o
 * ônibus (que avisa as famílias quando a troca é de hoje) e
 * `/despachante/escala` para montar a escala.
 *
 * Não é separação por organização, é por segurança: esta tela se
 * atualiza sozinha a cada quinze segundos, e um formulário que some
 * debaixo da mão de quem está digitando é um jeito conhecido de perder
 * trabalho. Quem vai escrever sai daqui de propósito.
 *
 * ## Por que o esqueleto só aparece na primeira carga
 *
 * `usePainelDoDespachante` mantém os dados anteriores durante a
 * atualização. Uma tela de operação que pisca a cada quinze segundos é
 * uma tela que ninguém consegue ler enquanto fala ao telefone.
 */
export default function PainelDoDespachantePage(): JSX.Element {
  const painel = usePainelDoDespachante();

  if (painel.isError && !painel.data) {
    return (
      <ErrorState
        message="Não foi possível carregar o painel da operação."
        onRetry={() => void painel.refetch()}
        isRetrying={painel.isFetching}
      />
    );
  }

  if (!painel.data) {
    return <EsqueletoDoPainel />;
  }

  const dados = painel.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Typography variant="title">Painel do despachante</Typography>
          <Typography variant="bodySmall" color="muted">
            A operação de hoje, atualizada às {horaDe(dados.atualizadoEm)}.
            {/*
              Quando a atualização falha mas ainda há dados na tela, a
              pessoa precisa saber que o que ela está lendo envelheceu.
              Sem isto, o painel continua parecendo ao vivo depois que a
              conexão caiu, que é a pior forma de falhar.
            */}
            {painel.isError ? (
              <span className="font-medium text-danger">
                {" "}
                A última tentativa de atualizar falhou, então estes números pararam no tempo.
              </span>
            ) : null}
          </Typography>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/despachante/trocar" className={buttonVariants({ variant: "secondary" })}>
            Trocar ônibus
          </Link>
          <Link href="/despachante/escala" className={buttonVariants({ variant: "primary" })}>
            Montar escala
          </Link>
        </div>
      </div>

      <IndicadoresDoPainelGeral indicadores={dados.indicadores} />

      {/*
        O mapa ocupa dois terços e as rotas um terço, porque é assim
        que o despachante olha: o mapa responde "onde", a lista responde
        "o quê", e ele precisa das duas ao mesmo tempo sem rolar a
        página.
      */}
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <MapaDaOperacao veiculos={dados.veiculos} atualizadoEm={dados.atualizadoEm} />
        <RotasDoDia rotas={dados.rotasDoDia} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <EscalaDoDiaResumida escala={dados.escalaDoDia} />
        <AlertasDoPainel alertas={dados.alertas} />
      </div>

      <EventosRecentes eventos={dados.eventosRecentes} />
    </div>
  );
}

/** Só na primeira carga: depois dela o painel troca os números sem piscar. */
function EsqueletoDoPainel(): JSX.Element {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Carregando o painel">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, indice) => (
          <Skeleton key={indice} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-[520px]" />
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  );
}
