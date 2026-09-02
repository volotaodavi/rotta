"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Animação de entrada discreta ao rolar (pedido do usuário 02/09/2026:
 * "os elementos das seções devem possuir animações de entrada discretas
 * usando IntersectionObserver... nada exagerado"). Sobe 12px + funde,
 * uma vez só (`unobserve` depois de revelar — nunca re-anima ao rolar
 * pra cima e voltar). `prefers-reduced-motion` já é tratado de forma
 * ampla em `globals.css` (zera toda `transition-duration` do site), mas
 * aqui também pulamos o estado inicial "invisível" quando o navegador
 * já reporta a preferência — sem isso, alguém com `reduced-motion`
 * ainda veria o conteúdo aparecer de repente ao cruzar a viewport, em
 * vez de já estar lá desde o início.
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
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className ?? ""}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
