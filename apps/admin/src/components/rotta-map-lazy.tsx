"use client";

import dynamic from "next/dynamic";

import type { RottaMapProps } from "@rotta/maps/types";

/**
 * Mesmo wrapper de `apps/web/src/components/rotta-map-lazy.tsx` — ver
 * o comentário completo lá. Auditoria de performance 31/08/2026 (pedido
 * do usuário: "o tempo de resposta está demorando muito"), aplicada
 * igualmente ao Painel Admin (Início, Inteligência, Monitoramento,
 * Escolas/mapa, Veículos/mapa) — o mesmo MapLibre GL JS pesado estava
 * embutido no chunk crítico de cada uma dessas rotas.
 */
export const RottaMapLazy = dynamic<RottaMapProps>(
  () => import("@rotta/maps/web").then((module_) => module_.RottaMap),
  {
    ssr: false,
    loading: () => <RottaMapSkeleton />,
  },
);

/** Placeholder exibido enquanto o chunk do mapa carrega — evita layout shift (o contêiner ao redor já define a altura). */
function RottaMapSkeleton(): JSX.Element {
  return <div className="h-full w-full animate-pulse bg-surface-elevated" aria-hidden="true" />;
}
