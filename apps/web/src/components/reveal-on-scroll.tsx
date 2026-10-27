"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Animação de entrada discreta ao rolar (pedido do usuário 02/09/2026:
 * "os elementos das seções devem possuir animações de entrada discretas
 * usando IntersectionObserver... nada exagerado"). Sobe 12px + funde,
 * uma vez só (`unobserve` depois de revelar — nunca re-anima ao rolar
 * pra cima e voltar).
 *
 * ## O estado inicial NÃO pode ser invisível no HTML
 *
 * Esta era a parte quebrada, e quebrava calado. O componente nascia com
 * `opacity-0` direto na classe, inclusive no HTML que o servidor manda.
 * Sem JavaScript o `IntersectionObserver` nunca roda, a opacidade nunca
 * volta, e 23 blocos de texto da landing ficavam invisíveis: o conteúdo
 * estava lá, no HTML, e ninguém via. Atinge quem bloqueia script, quem
 * está numa rede que engoliu o bundle, e qualquer rastreador que leia o
 * HTML sem executar JS.
 *
 * Agora o "invisível" mora no CSS, atrás de `.com-js`, uma classe que um
 * script síncrono no `<head>` põe no `<html>` antes do primeiro desenho
 * (ver `layout.tsx` e `globals.css`). Quem tem JS nunca vê o conteúdo
 * saltar; quem não tem nunca o vê sumir.
 *
 * Esconder só depois que o React monta seria pior que o defeito: o
 * bloco apareceria, sumiria na hidratação e voltaria com a animação.
 *
 * `prefers-reduced-motion` é tratado em dois lugares, de propósito:
 * aqui, pulando a espera pelo observador, e no CSS, cancelando o estado
 * inicial. Sem o do CSS, quem pediu menos movimento ainda veria o bloco
 * nascer invisível no primeiro desenho.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      // `data-reveal` em vez de classe de opacidade: é o seletor que o
      // CSS usa atrás de `.com-js`. A transição fica aqui porque vale
      // nos dois casos, e sem estado inicial ela simplesmente não tem o
      // que animar.
      data-reveal={visible ? "visivel" : "pendente"}
      className={`transition-all duration-700 ease-out ${className ?? ""}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
