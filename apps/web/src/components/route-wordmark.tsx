import Image from "next/image";

/**
 * Logotipo completo da Rotta — wordmark branco + ponto azul em gradiente
 * (`public/brand/rotta-wordmark-light.png`, recortado do arquivo enviado
 * pelo usuário; "light" no nome é a convenção usual de branding pra "cor
 * clara do logotipo", não o tema claro da plataforma). Só funciona sobre
 * fundo escuro — o wordmark é quase branco puro, fica invisível num fundo
 * claro. Por isso `RouteWordmark` substitui o par `<RouteMark/> Rotta`
 * (ícone + texto) só nos pontos com fundo escuro GARANTIDO, independente
 * do tema claro/escuro escolhido pelo usuário: a barra `.ink-scope` da
 * Landing Page (header/rodapé, sempre escura por design — ver
 * `globals.css`) e a página `/governo` (header fixo `bg-slate-950`).
 * Em qualquer lugar com fundo dependente do tema (login, 404, Legal
 * Center) o ícone `RouteMark` continua sozinho — troca aqui quebraria a
 * visibilidade no tema claro.
 */
export function RouteWordmark({ className }: { className?: string }): JSX.Element {
  return (
    <Image
      src="/brand/rotta-wordmark-light.png"
      alt="Rotta"
      width={509}
      height={154}
      className={className}
      priority
    />
  );
}
