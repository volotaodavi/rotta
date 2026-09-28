import { PrismaSchoolPortalRepository } from "../repositories/prisma-school-portal.repository";

import type { PrismaService } from "@/infra/database/prisma.service";

/**
 * O isolamento do Portal da Escola, no lugar onde ele de fato acontece.
 *
 * Este é o único módulo da Rotta que lê com `withBypass`, ou seja, com
 * a RLS do Postgres desligada. Não existe tenant para filtrar: quem
 * consulta é `Role.ESCOLA`, e uma escola é atendida por várias
 * transportadoras ao mesmo tempo. O que substitui a RLS é o `escolaId`
 * no `where` de TODA consulta — e é exatamente isso que estes testes
 * guardam. Se um deles cair, uma escola enxerga as crianças de outra, e
 * não existe erro pior neste produto.
 *
 * Os testes moravam no spec do serviço até a auditoria de 26/09/2026
 * (item 5), quando as consultas saíram de lá. A garantia não mudou de
 * valor, só de endereço — e ganhou os dois casos que faltavam
 * (`listContas` e `findEscola`).
 */
function criarRepositorio() {
  const studentFindMany = jest.fn().mockResolvedValue([]);
  const userFindMany = jest.fn().mockResolvedValue([]);
  const userFindUnique = jest.fn().mockResolvedValue(null);
  const schoolFindFirst = jest.fn().mockResolvedValue(null);
  const withBypass = jest.fn((operacao: unknown) => operacao);

  const prisma = {
    withBypass,
    student: { findMany: studentFindMany },
    user: { findMany: userFindMany, findUnique: userFindUnique },
    school: { findFirst: schoolFindFirst },
  } as unknown as PrismaService;

  return {
    repo: new PrismaSchoolPortalRepository(prisma),
    studentFindMany,
    userFindMany,
    schoolFindFirst,
    withBypass,
  };
}

describe("o escolaId no `where` é o que substitui a RLS", () => {
  it("alunos do dia: filtra pela escola pedida", async () => {
    const { repo, studentFindMany } = criarRepositorio();

    await repo.listAlunosComEventosDoDia("escola-1", new Date("2026-09-26T00:00:00.000Z"));

    expect(studentFindMany.mock.calls[0][0].where.schoolId).toBe("escola-1");
  });

  it("alunos do dia: nunca traz aluno excluído", async () => {
    const { repo, studentFindMany } = criarRepositorio();

    await repo.listAlunosComEventosDoDia("escola-1", new Date("2026-09-26T00:00:00.000Z"));

    expect(studentFindMany.mock.calls[0][0].where.deletedAt).toBeNull();
  });

  it("alunos do dia: os eventos são só os DAQUELE dia", async () => {
    // Sem este filtro, a tela da saída mostraria o embarque de ontem
    // como se a criança já estivesse no ônibus hoje.
    const dia = new Date("2026-09-26T00:00:00.000Z");
    const { repo, studentFindMany } = criarRepositorio();

    await repo.listAlunosComEventosDoDia("escola-1", dia);

    expect(studentFindMany.mock.calls[0][0].select.eventosViagem.where).toEqual({
      trip: { data: dia },
    });
  });

  it("contas: filtra pela escola pedida e ignora excluídas", async () => {
    const { repo, userFindMany } = criarRepositorio();

    await repo.listContas("escola-1");

    expect(userFindMany.mock.calls[0][0].where).toEqual({ escolaId: "escola-1", deletedAt: null });
  });

  it("escola: busca pelo id pedido e ignora excluída", async () => {
    const { repo, schoolFindFirst } = criarRepositorio();

    await repo.findEscola("escola-1");

    expect(schoolFindFirst.mock.calls[0][0].where).toEqual({ id: "escola-1", deletedAt: null });
  });
});

describe("o bypass é deliberado, e está em toda consulta", () => {
  it("as quatro consultas passam por withBypass", async () => {
    // Se alguma esquecer, ela volta a depender da RLS por `companyId`
    // — que para `Role.ESCOLA` não filtra nada e devolveria vazio, o
    // que apareceria como "a escola não tem aluno nenhum hoje".
    const { repo, withBypass } = criarRepositorio();

    await repo.findEscola("escola-1");
    await repo.listContas("escola-1");
    await repo.findContaById("conta-1");
    await repo.listAlunosComEventosDoDia("escola-1", new Date());

    expect(withBypass).toHaveBeenCalledTimes(4);
  });
});
