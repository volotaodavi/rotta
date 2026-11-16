import Image from "next/image";

/**
 * Logotipo real da Rotta (`public/brand/rotta-mark-*.png`, recortado do
 * arquivo enviado pelo usuário — círculo escuro com o monograma "R" em
 * gradiente azul, já dentro da paleta da marca, Dossiê 24). Nenhum
 * ponto que importa `RouteMark` precisa saber que é uma imagem — antes
 * era um SVG placeholder; se a marca mudar de novo, só este arquivo muda.
 */
export function RouteMark({
  className,
  decorativo = false,
}: {
  className?: string;
  /**
   * `true` quando a palavra "Rotta" já está escrita ao lado do símbolo
   * (`A11Y-11`, `docs/53-acessibilidade-do-site.md`). Aí a imagem não
   * acrescenta nada: com `alt="Rotta"` o leitor de tela lê o mesmo nome
   * duas vezes seguidas, e o link vira "Rotta Rotta".
   *
   * A decisão é de quem CHAMA, nunca do componente: o mesmo símbolo
   * aparece sozinho no topo de `(auth)` e no `/404`, e lá ele é a única
   * identificação da marca — apagar o `alt` ali tiraria informação de
   * verdade. Padrão `false`, que mantém o comportamento de sempre.
   */
  decorativo?: boolean;
}): JSX.Element {
  return (
    <Image
      src="/brand/rotta-mark-192.png"
      alt={decorativo ? "" : "Rotta"}
      width={192}
      height={192}
      className={className}
      priority
    />
  );
}
