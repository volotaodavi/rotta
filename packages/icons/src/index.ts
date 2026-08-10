/**
 * @rotta/icons (web) — icones da marca (Dossie 10, Secao 4; briefing
 * "ROTTA DIGITAL EXPERIENCE" — "Lucide Icons, nunca emoji ou biblioteca
 * generica misturada"). Fonte unica: Lucide (traco 2px, grade 24px,
 * tamanhos usuais 16/20/24/32px via prop `size`) — nenhum app importa
 * `lucide-react` diretamente, sempre por este barrel.
 *
 * `apps/web`/`apps/admin` (Next.js) importam daqui (`@rotta/icons`);
 * `apps/mobile` (React Native) importa de `@rotta/icons/native`
 * (Dossie 36 — mesmo catalogo de nomes de icone, renderizado via
 * `react-native-svg` em vez de `<svg>` do DOM; ver `./native.ts`).
 */

export * from "lucide-react";
