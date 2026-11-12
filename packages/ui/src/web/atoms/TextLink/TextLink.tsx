import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

import { cn } from "../../utils/cn";

/**
 * TextLink — um link DENTRO de um parágrafo.
 *
 * ## O defeito que isto conserta (A11Y-03, `docs/53`)
 *
 * O padrão espalhado pelo site era `text-primary hover:underline`: azul
 * em repouso, sublinhado só no hover. Para quem não distingue o azul do
 * texto em volta, não há link ali — o contraste entre os dois é de
 * 1,09:1, e `hover` não existe em tela sensível ao toque nem para quem
 * navega por teclado.
 *
 * A WCAG 1.4.1 (Use of Color, nível A) é explícita: cor não pode ser o
 * único meio de transmitir informação. Dentro de um bloco de texto, a
 * informação "isto aqui é clicável" precisa de uma segunda pista, e o
 * sublinhado é a que todo mundo já reconhece.
 *
 * ## Por que o sublinhado fica, e não só aparece no hover
 *
 * Porque a pergunta que o sublinhado responde — "dá para clicar?" — é
 * feita ANTES de passar o mouse. Um sublinhado que só aparece depois
 * responde tarde demais, e nunca responde no celular.
 *
 * ## Onde isto NÃO se aplica
 *
 * Cromo de navegação — item do menu do topo, aba, link do rodapé — e
 * link com cara de botão ou cartão clicável. Nesses a posição já diz
 * que é clicável, e a regra do axe (`link-in-text-block`) nem dispara,
 * porque só olha dentro de bloco de texto. Para link com cara de
 * botão, use `buttonVariants`.
 *
 * Uma LISTA de links de texto — o índice de um documento, "veja
 * também" — é caso de uso legítimo daqui: são links de texto, e o
 * sublinhado ajuda mais do que atrapalha.
 */
export interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

/**
 * As classes, isoladas do `<a>`.
 *
 * Existe pelo mesmo motivo de `buttonVariants`: o site usa `next/link`,
 * que já renderiza o `<a>` sozinho, e aninhar `<a>` dentro de `<a>` é
 * HTML inválido. Use
 * `<Link href={x} className={textLinkVariants()}>` nesse caso.
 */
export function textLinkVariants({ className }: { className?: string } = {}): string {
  return cn(
    // `underline-offset-2` para o traço não encostar nas descidas do
    // "p" e do "g", que é o que faz sublinhado parecer sujeira.
    "text-primary underline underline-offset-2",
    "hover:text-primary-hover",
    // Foco visível: Dossiê 24 §9. `rounded-sm` para o anel não sair
    // quadrado em volta de um texto que quebra em duas linhas.
    "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className,
  );
}

export const TextLink = forwardRef<HTMLAnchorElement, TextLinkProps>(function TextLink(
  { className, children, ...rest },
  ref,
) {
  return (
    <a ref={ref} className={textLinkVariants({ className })} {...rest}>
      {children}
    </a>
  );
});
