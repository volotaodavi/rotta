import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Todo campo de telefone do produto usa `PhoneInput`, nunca `Input`.
 *
 * ## Por que este teste existe
 *
 * O celular não é um dado de contato na Rotta, é uma CHAVE. A
 * transportadora pré-cadastra o aluno pelo celular do responsável
 * (`/alunos-pre-cadastro`); a família se acha digitando o mesmo
 * celular (`/vincular-transporte`); a conta de escola criada pelo
 * Admin usa o celular como login. Quando os dois lados eram `Input`
 * livre, um lado salvava `(11) 98888-7777` e o outro `11988887777`,
 * e as duas pontas do mesmo número não se encontravam: a família
 * informava o número certo e ouvia que não existia pré-cadastro
 * nenhum, e a conta de escola simplesmente não abria mais.
 *
 * `PhoneInput` resolve isso na origem: a pessoa só consegue digitar
 * dígitos, o campo para sozinho nos 11, e o que sai em
 * `onValueChange` são sempre os dígitos puros. A normalização no
 * servidor (`NormalizaTelefone`, em `apps/api`) continua existindo
 * como rede de segurança, mas rede de segurança não é lugar de
 * resolver formato de entrada.
 *
 * Este teste varre o fonte porque o defeito não é de comportamento de
 * uma tela, é de escolha de componente repetida em nove telas de três
 * aplicativos: o que precisa ser impedido é a décima.
 */
describe("campo de telefone", () => {
  /** `__dirname` é `apps/web/src/app`; a raiz do monorepo está quatro níveis acima. */
  const raiz = join(__dirname, "..", "..", "..", "..");

  /** Telas que coletam telefone/celular, em todas as plataformas web. */
  const telas = [
    "apps/web/src/app/(dashboard)/alunos-pre-cadastro/page.tsx",
    "apps/web/src/app/(dashboard)/vincular-transporte/page.tsx",
    "apps/web/src/app/(dashboard)/convites/page.tsx",
    "apps/web/src/app/(dashboard)/minha-escola/equipe/page.tsx",
    "apps/web/src/app/(dashboard)/escolas/novo/page.tsx",
    "apps/web/src/app/(dashboard)/escolas/[id]/page.tsx",
    "apps/web/src/app/(dashboard)/empresa/page.tsx",
    "apps/web/src/app/(marketing)/planos/assinar/page.tsx",
    "apps/web/src/app/(auth)/criar-conta/pessoal/page.tsx",
    "apps/web/src/app/(auth)/criar-conta/empresa/page.tsx",
    "apps/admin/src/app/(admin)/admin-contas/page.tsx",
    "apps/admin/src/app/(admin)/empresas/nova/page.tsx",
    "apps/admin/src/app/(admin)/empresas/[id]/editar/page.tsx",
    "apps/admin/src/features/schools/components/school-accounts-card.tsx",
    "apps/admin/src/features/students/components/company-students-tab.tsx",
  ];

  for (const tela of telas) {
    it(`${tela} usa PhoneInput`, () => {
      const fonte = readFileSync(join(raiz, tela), "utf8");
      expect(fonte).toContain("PhoneInput");
    });

    it(`${tela} não liga nenhum campo de telefone a um Input livre`, () => {
      const fonte = readFileSync(join(raiz, tela), "utf8");

      /* O que se procura é a ligação entre um `<Input>`/`<input>` e um
         estado de telefone: `value={...telefone...}` ou
         `value={...celular...}` dentro das linhas de um `Input`. Um
         `PhoneInput` também casa com `/Input/`, então a busca exige
         que o nome do componente NÃO venha precedido de "Phone". */
      const livres = [
        ...fonte.matchAll(/<(?<!Phone)[Ii]nput\b[^>]*?value=\{(?<ligado>[^}]*)\}/gs),
      ].filter((achado) => /telefone|celular|whatsapp/i.test(achado.groups?.ligado ?? ""));

      expect(livres.map((achado) => achado[0])).toEqual([]);
    });
  }
});
