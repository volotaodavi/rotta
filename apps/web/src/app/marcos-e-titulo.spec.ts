import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Toda página pública tem UM `<main>` e UM `h1` (`A11Y-06` e `A11Y-07`,
 * `docs/53-acessibilidade-do-site.md`). WCAG 1.3.1 Info and
 * Relationships (nível A) e 2.4.6 Headings and Labels (AA).
 *
 * ## O que isso resolve, na prática
 *
 * Quem navega por leitor de tela não vê a página: pede a lista de
 * cabeçalhos ou salta direto para o conteúdo principal. Sem `<main>`,
 * o salto não existe e cada visita recomeça pelo cabeçalho do site
 * inteiro; sem `h1`, a lista de cabeçalhos não diz onde a pessoa está.
 *
 * ## Por que ler o arquivo em vez de renderizar
 *
 * Mesmo motivo de `(auth)/preenchimento-automatico.spec.ts`: as telas
 * de cadastro estão presas a `useAuth`, ao cliente de API e ao
 * Turnstile, e montar nove delas custaria nove conjuntos de dublês para
 * afirmar a presença de um atributo. O que esse teste precisa pegar é a
 * tela NOVA que nasça sem `h1` — e para isso a fonte basta.
 *
 * Os comentários são removidos antes de qualquer comparação. A primeira
 * versão de um guard desses no `Badge` passava por causa do próprio
 * comentário que o documentava.
 */

const RAIZ = join(__dirname);

/**
 * As sete telas de autenticação da varredura (`scripts/a11y-check.sh`).
 *
 * `entrar` e `criar-conta/empresa` têm DOIS títulos cada: são estados
 * alternativos da mesma rota ("Escolha um perfil" quando a conta tem
 * mais de uma empresa, "Que bom! 🎉" depois do cadastro), que nunca
 * aparecem juntos — logo cada um é o `h1` da página enquanto está na
 * tela, e a regra abaixo vale para todos.
 *
 * Fora desta lista, e fora do escopo desta entrega, ainda há telas
 * públicas de autenticação sem `h1` (`esqueci-senha`,
 * `redefinir-senha`, `convite`, `onboarding`): não entraram nas 18
 * páginas auditadas. Ficam citadas para a ausência ser decisão
 * registrada, e não esquecimento.
 */
const TELAS_DE_AUTH = [
  "(auth)/entrar/page.tsx",
  "(auth)/selecionar-perfil/page.tsx",
  "(auth)/criar-conta/page.tsx",
  "(auth)/criar-conta/pessoal/page.tsx",
  "(auth)/criar-conta/empresa/page.tsx",
  "(auth)/criar-conta/motorista/page.tsx",
  "(auth)/criar-conta/profissional/page.tsx",
];

/** Lê o arquivo sem comentários de bloco nem de linha. */
function lerFonte(arquivo: string): string {
  return readFileSync(join(RAIZ, arquivo), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe.each(TELAS_DE_AUTH)("%s", (arquivo) => {
  const fonte = lerFonte(arquivo);

  it("tem um título como h1", () => {
    expect(fonte).toContain('as="h1"');
  });

  it("nenhum título de tela fica como h2 por padrão", () => {
    // `Typography variant="title"` rende `h2` quando ninguém diz o
    // contrário (`DEFAULT_ELEMENT` em `packages/ui`), e é esse padrão
    // que deixava as sete telas sem `h1` nenhum. Nestas telas todo
    // `variant="title"` é título DE PÁGINA — se algum dia uma delas
    // ganhar uma seção interna que deva ser `h2`, este teste falha de
    // propósito, para a decisão ser explícita (`as="h2"`).
    const titulos = fonte.match(/variant="title"[^>]*/g) ?? [];
    expect(titulos.length).toBeGreaterThan(0);
    for (const titulo of titulos) {
      expect(titulo).toContain('as="h1"');
    }
  });
});

describe("<main>", () => {
  /**
   * `(marketing)/layout.tsx` já tinha o seu. Estes dois não: a área de
   * autenticação só envolvia o formulário numa `<div>`, e `/governo`
   * monta o próprio cabeçalho e rodapé por fora do layout de
   * marketing — eram 27 blocos sem landmark nenhum.
   */
  it.each(["(auth)/layout.tsx", "governo/page.tsx"])("existe em %s", (arquivo) => {
    const fonte = lerFonte(arquivo);
    expect(fonte).toMatch(/<main[\s>]/);
    expect(fonte).toContain("</main>");
  });
});
