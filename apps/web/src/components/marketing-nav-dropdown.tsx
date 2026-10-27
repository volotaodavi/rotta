"use client";

import { ChevronDown } from "@rotta/icons";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { Route } from "next";

/**
 * O agrupador "Para quem" do cabeçalho do site.
 *
 * ## Por que existe
 *
 * O cabeçalho tinha sete itens de texto, e três deles começavam com a
 * mesma palavra ("Para responsáveis", "Para transportadores", "Para
 * motoristas"). Somados à logo e aos dois botões, não cabiam em
 * 1440px: o menu quebrava em duas linhas e o cabeçalho inteiro ficava
 * apertado. Agrupar os três num só item tira duas linhas de texto da
 * barra e, de quebra, diz melhor o que eles são: três portas para o
 * mesmo produto, não três assuntos diferentes.
 *
 * ## Divulgação, não menu
 *
 * É o padrão de *disclosure* (um botão que abre e fecha um painel), e
 * não o de *menu* da ARIA. A diferença importa: o painel aqui tem
 * links de navegação comuns, e o padrão de menu obrigaria setas do
 * teclado, `role="menuitem"` e gestão de foco por item, trocando o
 * comportamento que a pessoa já conhece (Tab anda pelos links) por um
 * que ela teria de descobrir. Para uma barra de navegação, a
 * divulgação é o certo.
 *
 * Fecha de quatro jeitos, todos necessários: Escape (e devolve o foco
 * ao botão, senão o foco fica órfão no fim da página), clique fora,
 * foco saindo do grupo pelo Tab, e clique num dos links.
 */
export function MarketingNavDropdown({
  rotulo,
  links,
}: {
  rotulo: string;
  links: { href: Route; label: string }[];
}): JSX.Element {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelId = useId();

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent): void {
      if (!containerRef.current?.contains(evento.target as Node)) setAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent): void {
      if (evento.key !== "Escape") return;
      setAberto(false);
      // Sem isto, o foco fica no painel que acabou de sumir, e o
      // próximo Tab recomeça do topo do documento.
      botaoRef.current?.focus();
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <div
      ref={containerRef}
      className="relative"
      // `focusout` em vez de `blur` no botão: o foco pode ir do botão
      // para um link do painel, e isso NÃO é sair do grupo. O
      // `relatedTarget` diz para onde o foco foi.
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
          setAberto(false);
        }
      }}
    >
      <button
        ref={botaoRef}
        type="button"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={() => setAberto((anterior) => !anterior)}
        className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-text-muted transition-colors hover:text-text"
      >
        {rotulo}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={painelId}
        // `hidden` em vez de desmontar: o nó precisa continuar na
        // árvore até o clique terminar de ser processado, pelo mesmo
        // motivo já documentado no menu móvel deste site (desmontar no
        // clique quebra a navegação no Safari do iOS).
        hidden={!aberto}
        className="absolute left-0 top-full z-40 mt-2 flex min-w-[15rem] flex-col rounded-xl border border-border bg-background p-1.5 shadow-lg"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setAberto(false)}
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-muted hover:text-text"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
