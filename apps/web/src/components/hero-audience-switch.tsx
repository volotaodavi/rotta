"use client";

import { buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import { AUDIENCIAS, TONE_BG } from "./audience-data";

/**
 * Seletor rápido de audiência na própria hero — mesmo papel que o
 * nav "Viajar / Ganhe dinheiro" da Uber cumpre logo no topo do site
 * dela (decide pra qual produto/fluxo te mandar antes de qualquer
 * outra coisa), só que aqui como 3 pills dentro da hero em vez de
 * itens de navegação, porque a Rotta tem 3 audiências (não 2) e o
 * conteúdo completo de cada uma já vive na seção "Para qual lado da
 * rota você está?" logo abaixo — este seletor só decide o alvo do CTA
 * principal, não duplica aquela seção (que tem bullets + visual
 * próprios). Clique muda o botão primário — nunca dispara nenhuma
 * chamada de rede, é só um roteador de intenção local.
 */
export function HeroAudienceSwitch(): JSX.Element {
  const [selecionado, setSelecionado] = useState(0);
  const audiencia = AUDIENCIAS[selecionado]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Você é...">
        {AUDIENCIAS.map((item, index) => {
          const ativo = index === selecionado;
          return (
            <button
              key={item.titulo}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setSelecionado(index)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                ativo
                  ? `${TONE_BG[item.tone]} text-white`
                  : "bg-surface text-text-muted hover:text-text"
              }`}
            >
              {item.titulo}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={audiencia.ctaHref}
          className={buttonVariants({ variant: "primary", size: "lg" })}
        >
          {audiencia.ctaLabel}
        </Link>
        {audiencia.temPlano && (
          <Link href="/planos" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Ver planos
          </Link>
        )}
      </div>
    </div>
  );
}
