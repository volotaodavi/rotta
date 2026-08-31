"use client";

import dynamic from "next/dynamic";

import type { RottaMapProps } from "@rotta/maps/types";

/**
 * Wrapper client-only de `RottaMap` (Frente de performance, auditoria
 * 31/08/2026 — pedido do usuário: "o tempo de resposta está demorando
 * muito"). Mesmo raciocínio de `hero-map-demo-lazy.tsx` (que já isolava
 * o MapLibre GL JS — ~140KB comprimido — da Landing Page), agora
 * aplicado a TODA rota do Painel que usa `<RottaMap/>` (Minha Rota,
 * Empresa, Alunos, Veículos, Escolas, Rotas, Atividades): antes, cada
 * uma dessas rotas embutia o MapLibre inteiro no chunk "crítico" da
 * página, mesmo quando o mapa é só uma entre várias seções da tela —
 * atrasando o primeiro paint de tudo o resto (cards, listas, botões)
 * até o MapLibre terminar de baixar/parsear.
 *
 * `next/dynamic(..., { ssr: false })` separa o componente num chunk
 * próprio, buscado em paralelo DEPOIS da hidratação do resto da página.
 * `ssr: false` é necessário (não só permitido): MapLibre usa WebGL/
 * `canvas`, que não existe no servidor.
 *
 * Import de `RottaMapProps` vem de `@rotta/maps/types` (não de
 * `@rotta/maps/web`) de propósito — `@rotta/maps/web` importa
 * `maplibre-gl` no topo do arquivo, então importar QUALQUER coisa de lá
 * (mesmo só um tipo teria custo zero, mas uma função como
 * `isCoordenadaValida` não) arrastaria o MapLibre pro bundle síncrono
 * de novo, anulando o ganho deste wrapper. `@rotta/maps/types` é puro
 * TypeScript/JS sem nenhuma dependência de mapa.
 */
export const RottaMapLazy = dynamic<RottaMapProps>(
  () => import("@rotta/maps/web").then((module_) => module_.RottaMap),
  {
    ssr: false,
    loading: () => <RottaMapSkeleton />,
  },
);

/** Placeholder exibido enquanto o chunk do mapa carrega — evita layout shift (o card/contêiner ao redor já define a altura). */
function RottaMapSkeleton(): JSX.Element {
  return <div className="h-full w-full animate-pulse bg-surface-elevated" aria-hidden="true" />;
}
