import Image from "next/image";

/**
 * Logotipo completo da Rotta — wordmark + ponto azul em gradiente, a
 * mesma arte em dois acabamentos de cor:
 *
 * - `variant="light"` (padrão): `public/brand/rotta-wordmark-light.png`,
 *   recortado do arquivo enviado pelo usuário; "light" é a convenção
 *   usual de branding pra "cor clara do logotipo" (quase branco puro),
 *   não o tema claro da plataforma. Só legível sobre fundo escuro
 *   GARANTIDO — a barra `.ink-scope` da Landing Page (rodapé) e a
 *   página `/governo` (header fixo `bg-slate-950`).
 * - `variant="dark"`: `public/brand/rotta-wordmark-dark.png`, gerado a
 *   partir do mesmo arquivo (pedido do usuário 02/09/2026: "deixe a
 *   logo original... cadê aquela logo completa, a que está igual no
 *   rodapé?", pro cabeçalho branco da Landing Page) — mesmíssimo
 *   desenho/proporções, só a parte "otta" recolorida pra `--color-text`
 *   (o R + ponto azul em gradiente é idêntico nos dois arquivos), do
 *   mesmo jeito que qualquer logotipo ganha uma versão clara e uma
 *   escura pra funcionar nos dois fundos — nunca um redesenho.
 *
 * Em qualquer lugar com fundo dependente do tema (login, 404, Legal
 * Center) nenhuma das duas variantes deve substituir o ícone
 * `RouteMark` sozinho — a troca quebraria a visibilidade num dos temas.
 */
const SOURCES = {
  light: "/brand/rotta-wordmark-light.png",
  dark: "/brand/rotta-wordmark-dark.png",
} as const;

export function RouteWordmark({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: keyof typeof SOURCES;
}): JSX.Element {
  return (
    <Image
      src={SOURCES[variant]}
      alt="Rotta"
      width={509}
      height={154}
      className={className}
      priority
    />
  );
}
