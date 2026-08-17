"use client";

import dynamic from "next/dynamic";

/**
 * Wrapper client-only de `HeroMapDemo` (Frente de otimização — Landing
 * Page). `HeroMapDemo` importa `RottaMap` (`@rotta/maps/web`), que
 * embute o MapLibre GL JS inteiro (~140KB comprimido, medido via
 * `curl --compressed` no chunk de produção). Antes deste arquivo,
 * `(marketing)/page.tsx` importava `HeroMapDemo` estaticamente no topo
 * — o bundler colocava o MapLibre inteiro no JavaScript "crítico" da
 * Landing Page, a página que MAIS gente visita sem estar logada (é
 * literalmente a porta de entrada do site), mesmo o mapa da hero sendo
 * só uma animação decorativa (dado de exemplo, nunca chama o backend —
 * ver comentário em `hero-map-demo.tsx`), não algo que precisa estar
 * pronto no primeiro paint.
 *
 * `next/dynamic(..., { ssr: false })` separa `HeroMapDemo` num chunk
 * próprio, buscado em paralelo DEPOIS da hidratação — o texto, os
 * botões e o resto da hero ficam interativos sem esperar o MapLibre
 * baixar/parsear. `ssr: false` é o certo aqui (não só permitido): mapas
 * MapLibre usam WebGL/`canvas`, que não existe no servidor, então
 * renderizar isso via SSR nunca fez sentido pra começo de conversa.
 *
 * Só é possível usar `ssr: false` aqui porque este arquivo É um Client
 * Component (`"use client"`) — o Next.js 15 proíbe `ssr: false` direto
 * num Server Component (que é o que `(marketing)/page.tsx` continua
 * sendo, por causa do `export const metadata`). Este wrapper existe só
 * pra isolar essa fronteira; nenhuma lógica nova além do `dynamic()`.
 */
export const HeroMapDemoLazy = dynamic(
  () => import("./hero-map-demo").then((module_) => module_.HeroMapDemo),
  {
    ssr: false,
    loading: () => <HeroMapDemoSkeleton />,
  },
);

/**
 * Placeholder exibido enquanto o chunk do mapa carrega — mesmas
 * dimensões/moldura de `HeroMapDemo` (`aspect-square`, `rounded-[32px]`,
 * `border-border`, `shadow-xl`) pra não causar layout shift quando o
 * mapa real substituir este bloco.
 */
function HeroMapDemoSkeleton(): JSX.Element {
  return (
    <div className="relative aspect-square w-full max-w-md">
      <div className="absolute -inset-6 rounded-[40px] bg-primary/10 blur-2xl" aria-hidden="true" />
      <div
        className="relative aspect-square w-full animate-pulse overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-xl"
        aria-hidden="true"
      />
    </div>
  );
}
