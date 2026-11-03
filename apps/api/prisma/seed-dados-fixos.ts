/**
 * Os dados fixos que os seeds de teste compartilham — e NADA mais.
 *
 * ## Por que este arquivo existe
 *
 * Porque `seed-e2e.ts` executa o seed inteiro ao ser **importado**: o
 * `main().then(...)` dele roda no nível do módulo. Quem importasse uma
 * constante de lá disparava, de brinde, o `limpar()` — que APAGA a
 * empresa e os usuários `@rotta.test`.
 *
 * O defeito que isso causou, em 03/11/2026, é bom de lembrar porque o
 * sintoma não aponta para a causa: `seed-demonstracao.ts` importava
 * `{ CONTAS, EMPRESA }` de `seed-e2e`, o seed-e2e começava a rodar em
 * paralelo, e no meio do caminho apagava a empresa que o
 * `seed-demonstracao` tinha acabado de ler. O erro que aparecia era
 * "Foreign key constraint violated on memberships_companyId_fkey" —
 * uma chave estrangeira apontando para uma empresa que existia segundos
 * antes. Perdi uma hora atrás de RLS, de FORCE ROW LEVEL SECURITY e de
 * política de INSERT antes de ver o "[seed-e2e] pronto" aparecendo na
 * saída do script errado.
 *
 * Este módulo não tem efeito nenhum: só constantes. Importar daqui é
 * seguro de qualquer lugar.
 */

/**
 * As credenciais que os testes digitam. Exportadas para os testes
 * importarem daqui em vez de repetirem a senha em cada arquivo — senha
 * copiada em sete lugares é senha que fica errada em um deles.
 */
export const CONTAS = {
  empresa: {
    email: "dono.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Dona Empresa E2E",
    cpf: "52998224725",
  },
  responsavel: {
    email: "mae.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Mãe Responsável E2E",
  },
  /**
   * Conta da equipe Rotta, para os testes do painel administrativo.
   *
   * `isAdminRotta` não é setável por nenhuma rota pública — é o único
   * papel sem tenant, e contas assim nascem internamente. Por isso o
   * seed a cria direto, que é o mesmo caminho de
   * `prisma/create-admin.ts`.
   */
  admin: {
    email: "admin.e2e@rotta.test",
    senha: "SenhaForte@123",
    nome: "Admin Rotta E2E",
    cpf: "15350946056",
  },
} as const;

export const EMPRESA = {
  nomeFantasia: "Transportes Teste E2E",
  cnpj: "19131243097692",
  codigoInterno: "TRN-999001",
} as const;

export const VEICULO = {
  /**
   * Placa no padrão Mercosul de verdade (`LLLNLNN`). A primeira versão
   * deste seed usou "E2E1A23", que parecia esperto e é INVÁLIDA: a
   * segunda posição tem de ser letra. O banco aceitou (o seed escreve
   * direto), e o cadastro pela tela recusava com "Placa inválida" —
   * dado impossível no banco faz o teste afirmar coisa errada.
   */
  placa: "RTA1E23",
  numeroFrota: "E2E-01",
} as const;
