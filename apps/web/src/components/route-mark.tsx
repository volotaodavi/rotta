import Image from "next/image";

/**
 * Logotipo real da Rotta (`public/brand/rotta-mark-*.png`, recortado do
 * arquivo enviado pelo usuário — círculo escuro com o monograma "R" em
 * gradiente azul, já dentro da paleta da marca, Dossiê 24). Nenhum
 * ponto que importa `RouteMark` precisa saber que é uma imagem — antes
 * era um SVG placeholder; se a marca mudar de novo, só este arquivo muda.
 */
export function RouteMark({ className }: { className?: string }): JSX.Element {
  return (
    <Image
      src="/brand/rotta-mark-192.png"
      alt="Rotta"
      width={192}
      height={192}
      className={className}
      priority
    />
  );
}
