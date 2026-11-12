import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Todo campo de cadastro diz ao navegador o que ele é (`A11Y-05`,
 * `docs/53-acessibilidade-do-site.md`). WCAG 1.3.5 Identify Input
 * Purpose, nível AA.
 *
 * ## O que a norma resolve, na prática
 *
 * `autocomplete` não é só conveniência. Para quem tem tremor, dor
 * crônica ou dificuldade de memória, digitar nome, e-mail e senha em
 * cada cadastro é a barreira — e o navegador (ou o gerenciador de
 * senhas) só preenche o que consegue identificar. Sem o atributo, o
 * campo é um retângulo anônimo e a ajuda não acontece.
 *
 * ## Por que ler o arquivo em vez de renderizar
 *
 * Porque são SEIS formulários em cinco arquivos, cada um preso a
 * `useAuth`, ao cliente de API e ao Turnstile. Montar os seis custaria
 * seis conjuntos de dublês para afirmar a presença de um atributo —
 * e um teste caro é um teste que alguém apaga quando dá trabalho.
 *
 * Ler o arquivo também pega o caso que mais interessa: um formulário
 * NOVO que nasça sem os atributos. Basta acrescentá-lo à lista abaixo.
 */

const RAIZ = join(__dirname);

/**
 * Cada formulário e o que ele precisa declarar.
 *
 * `criar-conta/motorista` e `criar-conta/profissional` ficam de fora de
 * propósito: são telas de ESCOLHA ("como você trabalha?"), sem nenhum
 * campo de entrada. Estão citadas aqui para a ausência ser uma decisão
 * registrada, e não um esquecimento.
 */
const FORMULARIOS: { arquivo: string; exige: string[] }[] = [
  { arquivo: "criar-conta/pessoal/page.tsx", exige: ["name", "email", "new-password"] },
  { arquivo: "criar-conta/empresa/page.tsx", exige: ["name", "email", "new-password"] },
  { arquivo: "convite/page.tsx", exige: ["name", "email", "new-password"] },
  {
    arquivo: "convite/_components/convite-transportadora-form.tsx",
    exige: ["name", "email", "new-password"],
  },
  {
    arquivo: "convite/_components/convite-autonomo-form.tsx",
    exige: ["name", "email", "new-password"],
  },
  { arquivo: "redefinir-senha/page.tsx", exige: ["new-password"] },
];

function ler(arquivo: string): string {
  return readFileSync(join(RAIZ, arquivo), "utf8");
}

describe.each(FORMULARIOS)("$arquivo", ({ arquivo, exige }) => {
  const fonte = ler(arquivo);

  it.each(exige)("declara autoComplete=%s", (valor) => {
    expect(fonte).toContain(`autoComplete="${valor}"`);
  });

  it("nenhum campo de senha fica sem autoComplete", () => {
    // `type="password"` sem `autoComplete` faz o gerenciador de senhas
    // ou ignorar o campo, ou oferecer a senha errada — o navegador não
    // tem como saber se é "entrar" ou "cadastrar".
    //
    // Pega as duas formas: o literal, e o `type={mostrarSenha ? "text"
    // : "password"}` das telas com o botão de revelar. A primeira
    // versão deste teste só via o literal, e por isso dava como
    // "sem campo de senha" justamente as duas telas que têm dois.
    const senhas =
      fonte.match(/type=(?:"password"|\{[^}]*"password"[^}]*\})[\s\S]{0,320}?\/>/g) ?? [];
    expect(senhas.length).toBeGreaterThan(0);
    for (const campo of senhas) {
      expect(campo).toMatch(/autoComplete="(new-password|current-password)"/);
    }
  });
});

describe("login", () => {
  it("a senha de entrar é `current-password`, não `new-password`", () => {
    // O valor errado aqui faz o navegador oferecer para SALVAR uma
    // senha nova em vez de preencher a que já existe.
    const fonte = ler("entrar/page.tsx");
    expect(fonte).toContain('autoComplete="current-password"');
    expect(fonte).not.toContain('autoComplete="new-password"');
  });
});
