import Image from "next/image";

/**
 * Logotipo completo pra uso sobre fundo CLARO (cabeçalho branco da
 * Landing Page, pedido do usuário 02/09/2026) — `RouteWordmark` só
 * funciona em fundo escuro (é quase branco puro). Aqui, o símbolo "R"
 * é o mesmo PNG oficial (`/brand/rotta-mark.png`, nunca redesenhado —
 * "a logo possui um R estilizado próprio... utilize exatamente o asset
 * oficial existente") ao lado do nome em texto, na mesma tipografia
 * (Inter) do resto da plataforma — igual à decisão já tomada em
 * `apps/mobile/src/components/rotta-logo.tsx` pro app nativo, que
 * também não tem um wordmark próprio em imagem pra fundo claro. Nunca
 * um segundo "R" antes do nome: o mark já É o R.
 */
export function RottaLogoLockup({ className }: { className?: string }): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src="/brand/rotta-mark.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8"
        priority
      />
      <span className="text-lg font-bold tracking-tight text-text">Rotta</span>
    </span>
  );
}
