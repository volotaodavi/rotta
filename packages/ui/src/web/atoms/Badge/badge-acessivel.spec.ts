import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * O `Badge` continua atendendo ao contraste da WCAG (`A11Y-02`,
 * `docs/53-acessibilidade-do-site.md`).
 *
 * ## Por que este teste lê o arquivo em vez de renderizar
 *
 * Porque `@rotta/ui` roda em `ts-jest` no ambiente `node`, sem jsdom
 * (ver `jest.config.js`) — não há onde renderizar React aqui. A
 * convenção da casa para esse caso já existe: `marca-oficial.spec.ts`
 * compara os BYTES dos arquivos de logo.
 *
 * ## Por que ele é necessário, tendo `contraste-wcag.spec.ts`
 *
 * Aquele arquivo prova a CONTA: que `text` sobre `secondary/20` passa
 * e que `text-muted` reprovaria. Mas ele calcula com tokens, não lê o
 * componente — continuaria verde se alguém devolvesse
 * `text-text-muted` ao `Badge` amanhã, achando que fica mais discreto.
 *
 * Este aqui é o que quebra nesse dia. Os dois juntos dizem a coisa
 * toda: um mostra o número, o outro prende o componente ao número.
 */

const FONTE = readFileSync(join(__dirname, "Badge.tsx"), "utf8");

describe("Badge, variante neutra", () => {
  it("usa o texto principal, nunca o cinza de legenda", () => {
    // `bg-secondary/20 text-text-muted` dava 3,98:1 no pior dos oito
    // fundos reais, contra o mínimo de 4,5:1 para os 12px deste selo.
    expect(FONTE).toMatch(/neutral:\s*"bg-secondary\/20 text-text"/);
    expect(FONTE).not.toMatch(/neutral:\s*"[^"]*text-text-muted/);
  });
});

describe("Badge sobre superfície escura", () => {
  it("aceita `surface` e marca o elemento como tema escuro", () => {
    // É o que faz `bg-info/15 text-info` resolver pela paleta escura
    // dentro do herói do `/governo`, que é escuro em qualquer tema.
    expect(FONTE).toContain("surface?: BadgeSurface");
    expect(FONTE).toMatch(/data-theme=\{surface === "dark" \? "dark" : undefined\}/);
  });

  it("não cria uma paleta paralela de cores", () => {
    // O conserto é declarar a superfície, não inventar tokens. Se
    // alguém escrever cor em hexadecimal aqui, o design system deixa
    // de ser a fonte única — e é isso que esta linha impede.
    expect(FONTE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
