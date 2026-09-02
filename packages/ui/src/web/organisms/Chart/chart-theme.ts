/**
 * Tema compartilhado dos gráficos `recharts` (Dossiê 24/25 — primeira
 * biblioteca de gráficos do monorepo, adicionada pra parar de desenhar
 * "gráfico" com `<div>`s e `style={{height}}` inline, como o
 * comparativo de viagens da Home do Admin fazia até aqui). Sempre as
 * mesmas variáveis CSS dos tokens de cor (`packages/theme`), nunca hex
 * solto — funciona nos dois temas (claro/escuro) automaticamente, sem
 * re-render, porque o navegador resolve a variável CSS na hora de
 * pintar. Mesma convenção de `withOpacity()` em `tailwind.config.ts`
 * (`rgb(var(--color-x))`).
 */
export const CHART_PALETTE = [
  "rgb(var(--color-primary))",
  "rgb(var(--color-success))",
  "rgb(var(--color-warning))",
  "rgb(var(--color-danger))",
  "rgb(var(--color-info))",
] as const;

export const chartGridStroke = "rgb(var(--color-border))";

export const chartAxisTickStyle = { fill: "rgb(var(--color-text-muted))", fontSize: 12 } as const;

export const chartCursorFill = "rgb(var(--color-muted))";
