"use client";

import { Spinner } from "@rotta/ui/web";
import dynamic from "next/dynamic";

/**
 * ACHADO REAL — 2ª reprodução ao vivo (build `9a04698`): isolar só as
 * três seções filhas via `dynamic(..., { ssr: false })` não resolveu.
 * O último checkpoint registrado (`@/lib/render-checkpoint.ts`) foi
 * `rota-detalhe:retorno-spinner-carregando` — todos os hooks e o
 * primeiro `return` já tinham rodado; a falha acontece DEPOIS desse
 * ponto, fora do alcance de qualquer instrumentação dentro da própria
 * implementação. Contenção definitiva: isolar a implementação INTEIRA
 * (`./_components/route-detail-client.tsx`) do SSR desta página — este
 * arquivo passa a ser só um carregador mínimo, sem NENHUM import da
 * árvore funcional (hooks de rotas/equipe, autenticação, labels,
 * seções, `SectionErrorBoundary`, api-client) — só `Spinner` e
 * `dynamic`, de propósito, pra o servidor nunca chegar a avaliar esse
 * código nesta página.
 */
const RouteDetailClient = dynamic(() => import("./_components/route-detail-client"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  ),
});

export default function RotaDetalhePage(): JSX.Element {
  return <RouteDetailClient />;
}
