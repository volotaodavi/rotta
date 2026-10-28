/**
 * Os dados que `apps/api/prisma/seed-e2e.ts` escreveu.
 *
 * ## Por que uma cópia, e não um import
 *
 * Porque importar de `apps/api` traria o `@prisma/client` e as
 * constantes do domínio para dentro do processo do Playwright, que roda
 * no diretório do painel e não tem nada disso. A duplicação é pequena,
 * e o teste de login falha alto no primeiro caractere errado — é a
 * própria suíte que guarda a cópia.
 */

export const CONTAS = {
  empresa: {
    email: "dono.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Dona Empresa E2E",
  },
  responsavel: {
    email: "mae.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Mãe Responsável E2E",
  },
} as const;

export const EMPRESA = {
  nomeFantasia: "Transportes Teste E2E",
  /** O que a família digita em `/vincular-transporte`. */
  codigoInterno: "TRN-999001",
} as const;

export const VEICULO_SEMEADO = {
  placa: "RTA1E23",
  numeroFrota: "E2E-01",
} as const;
