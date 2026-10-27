import { readFileSync } from "node:fs";
import { join } from "node:path";

import { darkColors, lightColors } from "@rotta/theme";
import { describe, expect, it } from "vitest";

/**
 * As variáveis CSS de `globals.css` contra os tokens de `@rotta/theme`.
 *
 * ## Por que este teste existe
 *
 * `globals.css` diz, no próprio comentário, que "os valores abaixo
 * espelham MANUALMENTE `packages/theme/src/tokens/*.ts`". Espelho
 * manual é espelho que racha, e rachou: em 27/10/2026 as quatro cores
 * semânticas e o cinza de legenda foram escurecidos nos tokens para
 * passar no contraste AA, com teste próprio em `packages/ui`, e **a
 * web continuou servindo os valores antigos**. Os tokens em TypeScript
 * não são lidos por nada no navegador: quem pinta a tela é este CSS.
 *
 * O defeito só apareceu porque o Lighthouse rodou contra a página de
 * verdade e reclamou do mesmo `#16a34a` que já tinha sido trocado. Sem
 * essa conferência, a correção de contraste teria sido dada como feita
 * sem nunca ter chegado a um pixel.
 *
 * Este teste é a rede até o dia em que o CSS passar a ser GERADO a
 * partir do TypeScript, que é o conserto definitivo e está escrito
 * como pendência no topo do `globals.css`.
 */

const CSS = readFileSync(join(__dirname, "../globals.css"), "utf8");

/** `#RRGGBB` -> `"R G B"`, o formato que o Tailwind exige para opacidade. */
function comoCanais(hex: string): string {
  const limpo = hex.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(limpo.slice(i, i + 2), 16)).join(" ");
}

/** O valor de uma variável dentro de um bloco de seletor. */
function variavelNoBloco(seletor: string, variavel: string): string | null {
  const bloco = new RegExp(`${seletor}\\s*\\{([^}]*)\\}`, "s").exec(CSS);
  if (!bloco?.[1]) return null;
  const casamento = new RegExp(`${variavel}:\\s*([^;]+);`).exec(bloco[1]);
  return casamento?.[1]?.trim() ?? null;
}

/**
 * Só as cores que mudaram no ajuste de contraste, mais o texto
 * principal e o fundo.
 *
 * Não é a paleta inteira de propósito: boa parte dos tokens tem nome
 * diferente dos dois lados (`surfaceElevated` virou
 * `--color-surface-elevated`, `driverPrimary` virou
 * `--color-driver-primary`), e um teste que tentasse casar tudo
 * passaria a cobrar uma convenção de nome em vez de cobrar o valor.
 * Estas são as que uma pessoa lê como texto, e onde a diferença se
 * mede em contraste.
 */
const CONFERIDAS = [
  ["--color-success", "success"],
  ["--color-warning", "warning"],
  ["--color-danger", "danger"],
  ["--color-info", "info"],
  ["--color-text", "text"],
  ["--color-text-muted", "textMuted"],
  ["--color-background", "background"],
] as const;

describe("tema claro", () => {
  it.each(CONFERIDAS)("%s é o mesmo valor do token %s", (variavel, token) => {
    expect(variavelNoBloco('\\[data-theme="light"\\]', variavel)).toBe(
      comoCanais(lightColors[token]),
    );
  });
});

describe("tema escuro", () => {
  it.each(CONFERIDAS)("%s é o mesmo valor do token %s", (variavel, token) => {
    // O bloco escuro é o `:root`, porque o escuro é o padrão da
    // plataforma e não depende de `prefers-color-scheme`.
    expect(variavelNoBloco(':root,\\s*\\[data-theme="dark"\\]', variavel)).toBe(
      comoCanais(darkColors[token]),
    );
  });
});
