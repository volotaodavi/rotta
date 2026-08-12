"use client";

import { Button } from "@rotta/ui/web";

import type { ComponentProps } from "react";

const PULSE_CLASSES = ["ring-4", "ring-primary/60", "rounded-[32px]"];
const PULSE_DURATION_MS = 1200;

/**
 * Botão "Ver o GPS em tempo real" da hero do `/governo` — o alvo
 * (`#demonstracao`) já fica visível ao lado do texto em telas largas
 * (`lg:grid-cols-2`), então rolar até ele não move nada e o clique
 * parece morto. Em vez de depender só do scroll perceptível, sempre dá
 * um pulso visual (anel destacado) no card do mapa por ~1.2s — funciona
 * em qualquer largura de tela, com ou sem rolagem de verdade.
 */
export function ScrollToDemoButton({
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, "onClick">): JSX.Element {
  function handleClick(): void {
    const el = document.getElementById("demonstracao");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add(...PULSE_CLASSES);
    window.setTimeout(() => el.classList.remove(...PULSE_CLASSES), PULSE_DURATION_MS);
  }

  return (
    <Button {...buttonProps} onClick={handleClick}>
      {children}
    </Button>
  );
}
