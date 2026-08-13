/**
 * Classes de botão em pílula — só para a Landing Page (`(marketing)/
 * page.tsx`, `layout.tsx`, `hero-audience-switch.tsx`), adaptação do
 * sistema visual de referência trazido pelo usuário ("Perk": raio 28px
 * em cartões/botões primários, 9999px em pílulas/tags, zero sombra,
 * pilha tonal de superfícies em vez de elevação) para a identidade real
 * da Rotta — azul/preto/branco/cinza (`packages/theme/src/tokens/
 * colors.ts`), nunca a cor lime da referência.
 *
 * Por que não usar `buttonVariants` de `@rotta/ui` aqui: a base dele é
 * `rounded-md` (Dossiê 25 §2.1, usada no resto do produto — painel,
 * admin, mobile web — e não deve mudar por causa da Landing Page). O
 * `cn()` de `@rotta/ui` é só concatenação (sem `tailwind-merge`), então
 * sobrescrever radius via `className` não é confiável — a classe que
 * "vence" no CSS final depende da ordem de geração do Tailwind, não da
 * ordem no atributo. Em vez de arriscar, estas classes existem do zero,
 * só para os botões da Landing Page que adotam o formato pílula.
 */

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-colors duration-150 active:scale-[0.98] outline-none " +
  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** CTA principal — único botão preenchido do sistema (mesma regra do "Perk": uma cor cromática só, nunca uma segunda). */
export const pillPrimary = `${BASE} bg-primary px-6 py-3.5 text-[15px] text-white hover:bg-primary-hover`;
export const pillPrimaryLg = `${BASE} bg-primary px-7 py-4 text-base text-white hover:bg-primary-hover`;
export const pillPrimarySm = `${BASE} bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover`;

/** Ação secundária — contorno, nunca uma segunda cor preenchida. */
export const pillGhost = `${BASE} border border-border px-6 py-3.5 text-[15px] text-text hover:bg-muted`;
export const pillGhostLg = `${BASE} border border-border px-7 py-4 text-base text-text hover:bg-muted`;
export const pillGhostSm = `${BASE} px-4 py-2 text-sm text-text-muted hover:text-text`;

/** Pílula preenchida em branco — usada só sobre a faixa de fundo azul (accent block), onde um botão azul sumiria. */
export const pillOnAccentLg = `${BASE} bg-background px-7 py-4 text-base text-text hover:opacity-90`;
