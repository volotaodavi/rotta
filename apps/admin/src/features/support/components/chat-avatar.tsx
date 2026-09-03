/** Paleta fixa (mesmos tokens semânticos já usados no resto do painel — nunca cor inventada fora do design system) — a cor de cada avatar é determinística a partir do nome, só pra distinguir conversas visualmente, mesmo papel do avatar colorido do WhatsApp. */
const PALETTE = ["bg-primary", "bg-info", "bg-success", "bg-warning", "bg-danger"] as const;

function paletteIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % PALETTE.length;
  }
  return Math.abs(hash);
}

export function ChatAvatar({
  nome,
  size = "md",
}: {
  nome: string;
  size?: "sm" | "md";
}): JSX.Element {
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClass} ${PALETTE[paletteIndex(nome)]}`}
      aria-hidden="true"
    >
      {inicial}
    </div>
  );
}
