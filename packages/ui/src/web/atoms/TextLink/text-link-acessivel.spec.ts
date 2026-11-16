import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `TextLink` continua distinguível sem depender da cor (`A11Y-03`,
 * `docs/53-acessibilidade-do-site.md`). WCAG 1.4.1, nível A.
 *
 * Lê o arquivo-fonte porque `@rotta/ui` roda em `node`, sem jsdom —
 * mesma convenção de `badge-acessivel.spec.ts` e `marca-oficial.spec.ts`.
 *
 * O que estes testes impedem é uma volta silenciosa ao padrão antigo:
 * `text-primary hover:underline` não quebra compilação, não quebra
 * teste nenhum, e some da revisão de código porque parece idêntico.
 * Só reaparece numa auditoria seis meses depois.
 */

/**
 * O arquivo SEM os comentários.
 *
 * O primeiro teste escrito aqui reprovou por causa da própria
 * documentação: o comentário do componente cita `text-primary
 * hover:underline` para explicar qual era o defeito, e o teste que
 * proíbe esse padrão encontrou a citação. Um guarda que não distingue
 * código de prosa transforma "explicar o erro" em erro — e o conserto
 * óbvio, apagar a explicação, é o pior dos dois mundos.
 */
const FONTE = readFileSync(join(__dirname, "TextLink.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("TextLink", () => {
  it("sublinha em repouso, não só no hover", () => {
    // `underline` solto, fora de qualquer prefixo de estado. A pergunta
    // "dá para clicar?" é feita ANTES de passar o mouse — e no celular
    // não há mouse.
    expect(FONTE).toMatch(/"text-primary underline underline-offset-2"/);
  });

  it("não esconde o sublinhado atrás de hover ou focus", () => {
    expect(FONTE).not.toMatch(/hover:underline/);
    expect(FONTE).not.toMatch(/focus:underline/);
  });

  it("tem foco visível", () => {
    // Dossiê 24 §9. Sem isto, quem navega por teclado perde o link de
    // vista exatamente quando ele está selecionado.
    expect(FONTE).toContain("focus-visible:ring-2");
  });

  it("expõe as classes separadas do elemento, para uso com next/link", () => {
    // `<a>` dentro de `<a>` é HTML inválido, e `next/link` já renderiza
    // um. Mesma razão de `buttonVariants`.
    expect(FONTE).toContain("export function textLinkVariants");
  });
});
