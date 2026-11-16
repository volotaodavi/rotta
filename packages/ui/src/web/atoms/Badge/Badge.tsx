import { cn } from "../../utils/cn";

import type { ReactNode } from "react";

/** Badge — Dossiê 25 §2.9. Nunca clicável (ver `Chip` para esse caso) e nunca o único portador de um estado (sempre texto). */
export type BadgeVariant = "neutral" | "success" | "danger" | "warning" | "info";

/**
 * Em que tipo de superfície o selo está pousado.
 *
 * `default` segue o tema do visitante. `dark` é para uma seção que é
 * escura em QUALQUER tema — o herói do `/governo`, por exemplo, que é
 * `bg-slate-950` tanto no tema claro quanto no escuro. Ver `A11Y-02`
 * em `docs/53-acessibilidade-do-site.md`.
 */
export type BadgeSurface = "default" | "dark";

export interface BadgeProps {
  variant?: BadgeVariant;
  surface?: BadgeSurface;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  /**
   * `text-text`, e não `text-text-muted`.
   *
   * O neutro é o único selo que mistura DOIS tokens diferentes — cinza
   * de fundo com cinza de texto —, e por isso era o único que escapava
   * de `contraste-wcag.spec.ts`, que cobre as semânticas usando a
   * própria cor como texto. Com `text-text-muted` ele dava entre
   * 3,98:1 e 4,40:1 nos oito fundos reais, abaixo do mínimo de 4,5:1
   * da WCAG 2.2 AA para os 12px deste componente.
   *
   * Baixar a opacidade do fundo não resolvia com folga (a 10% ainda
   * dava 4,61:1): o defeito é a combinação, não a dosagem. Ver
   * `A11Y-02` em `docs/53-acessibilidade-do-site.md`.
   */
  neutral: "bg-secondary/20 text-text",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

export function Badge({
  variant = "neutral",
  surface = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      /**
       * `data-theme="dark"` em vez de uma paleta paralela.
       *
       * As classes continuam as mesmas (`bg-info/15 text-info`): o que
       * muda é de onde as variáveis de cor são lidas. `globals.css`
       * define a paleta escura em `:root, [data-theme="dark"]`, e uma
       * variável declarada num elemento vale para as declarações DESSE
       * elemento — então o selo passa a resolver pelo escuro sozinho,
       * sem afetar nada em volta.
       *
       * Sobre `bg-slate-950` isso leva o selo `info` de 3,26:1 para
       * 8,74:1. Nenhum token novo, nenhuma cor inventada: é declarar
       * que o selo está sobre superfície escura, o que é verdade.
       */
      data-theme={surface === "dark" ? "dark" : undefined}
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
