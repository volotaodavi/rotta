"use client";

import Link from "next/link";
import { useState } from "react";

import { AUDIENCIAS, TONE_BG, TONE_ON_BG_TEXT } from "./audience-data";
import { pillGhostLg, pillPrimaryLg } from "./pill-button-classes";

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
                  ? `${TONE_BG[item.tone]} ${TONE_ON_BG_TEXT[item.tone]}`
                  : "bg-surface text-text-muted hover:text-text"
              }`}
            >
              {item.titulo}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={audiencia.ctaHref} className={pillPrimaryLg}>
          {audiencia.ctaLabel}
        </Link>
        {audiencia.temPlano && (
          <Link href="/planos" className={pillGhostLg}>
            Ver planos
          </Link>
        )}
      </div>
    </div>
  );
}
