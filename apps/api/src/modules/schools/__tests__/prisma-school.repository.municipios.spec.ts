import { PrismaSchoolRepository } from "../repositories/prisma-school.repository";

import type { PrismaService } from "@/infra/database/prisma.service";

/**
 * Lista de municípios do catálogo (24/09/2026).
 *
 * Existe porque o usuário apontou o tamanho real do problema: *"são
 * mais de 100 mil [escolas], não é possível que o sistema não
 * aguenta"*. A resposta foi agregar no banco e deixar o Admin ESCOLHER
 * o município em vez de digitá-lo.
 *
 * Os três testes guardam as três decisões que fazem isso funcionar:
 * agregar em vez de listar, fundir grafias diferentes da mesma cidade,
 * e somar as contagens ao fundir.
 */
function criarRepositorio(grupos: unknown[]) {
  const groupBy = jest.fn().mockResolvedValue(grupos);
  const prisma = { school: { groupBy } } as unknown as PrismaService;
  return { repo: new PrismaSchoolRepository(prisma), groupBy };
}

describe("listMunicipios", () => {
  it("AGREGA no banco — nunca traz as escolas", async () => {
    // O catálogo passa de 100 mil linhas. Um `findMany` para contar
    // municípios carregaria ~50 mil registros só para descobrir que SP
    // tem 645 municípios.
    const { repo, groupBy } = criarRepositorio([]);

    await repo.listMunicipios("rj");

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["cidade", "cidadeNormalizada"],
        where: expect.objectContaining({ estado: "RJ", deletedAt: null, status: "ATIVA" }),
      }),
    );
  });

  it("funde grafias diferentes da MESMA cidade e soma as contagens", async () => {
    // A planilha de 2024 gravou "MARICA" e a de 2025, "Maricá". Para o
    // Admin é uma cidade só, com 62 escolas — e é isso que o
    // credenciamento vai pegar, porque o `where` busca pela chave
    // normalizada, que é a mesma nos dois casos.
    const { repo } = criarRepositorio([
      { cidade: "MARICA", cidadeNormalizada: "marica", _count: { _all: 12 } },
      { cidade: "Maricá", cidadeNormalizada: "marica", _count: { _all: 50 } },
      { cidade: "Niterói", cidadeNormalizada: "niteroi", _count: { _all: 8 } },
    ]);

    const municipios = await repo.listMunicipios("RJ");

    expect(municipios).toHaveLength(2);
    const marica = municipios.find((m) => m.cidadeNormalizada === "marica");
    expect(marica?.escolas).toBe(62);
    // A grafia com mais escolas vence — é a que o Admin reconhece.
    expect(marica?.cidade).toBe("Maricá");
  });

  it("a grafia campeã não depende da ordem em que o banco devolveu", async () => {
    // Bug fácil de escrever: comparar a grafia nova contra o total
    // ACUMULADO em vez de contra a campeã atual faria a última lida
    // vencer sempre.
    const { repo } = criarRepositorio([
      { cidade: "Maricá", cidadeNormalizada: "marica", _count: { _all: 50 } },
      { cidade: "MARICA", cidadeNormalizada: "marica", _count: { _all: 12 } },
    ]);

    const [marica] = await repo.listMunicipios("RJ");

    expect(marica?.cidade).toBe("Maricá");
    expect(marica?.escolas).toBe(62);
  });

  it("apara o espaço da planilha — o rótulo nunca sai '  MARICÁ  '", async () => {
    // Caso real, encontrado rodando contra um Postgres de verdade: a
    // planilha do INEP traz espaço sobrando com alguma frequência. O
    // banco já ignora isso na CHAVE (a coluna gerada usa `btrim`), mas
    // o rótulo vem da coluna `cidade` crua.
    const { repo } = criarRepositorio([
      { cidade: "  MARICÁ  ", cidadeNormalizada: "marica", _count: { _all: 1 } },
    ]);

    const [marica] = await repo.listMunicipios("RJ");

    expect(marica?.cidade).toBe("MARICÁ");
  });

  it("empate em contagem: 'Maricá' vence 'MARICA' e 'maricá'", async () => {
    // Também veio do teste contra o banco real: em município pequeno as
    // grafias empatam em uma escola cada, e sem critério o rótulo saía
    // aleatório — quem o banco devolvesse primeiro. O Admin precisa
    // RECONHECER o nome da cidade na lista.
    const { repo } = criarRepositorio([
      { cidade: "MARICA", cidadeNormalizada: "marica", _count: { _all: 1 } },
      { cidade: "maricá", cidadeNormalizada: "marica", _count: { _all: 1 } },
      { cidade: "Maricá", cidadeNormalizada: "marica", _count: { _all: 1 } },
      { cidade: "  MARICÁ  ", cidadeNormalizada: "marica", _count: { _all: 1 } },
    ]);

    const [marica] = await repo.listMunicipios("RJ");

    expect(marica?.cidade).toBe("Maricá");
    expect(marica?.escolas).toBe(4);
  });

  it("contagem ainda vence a apresentação — 'MARICA' com 50 ganha de 'Maricá' com 1", async () => {
    // A ordem de desempate importa: a grafia dominante na base é o que
    // o Admin vê no resto do sistema.
    const { repo } = criarRepositorio([
      { cidade: "Maricá", cidadeNormalizada: "marica", _count: { _all: 1 } },
      { cidade: "MARICA", cidadeNormalizada: "marica", _count: { _all: 50 } },
    ]);

    const [marica] = await repo.listMunicipios("RJ");

    expect(marica?.cidade).toBe("MARICA");
  });

  it("ordena por nome, em português — acento não joga a cidade para o fim", async () => {
    const { repo } = criarRepositorio([
      { cidade: "Zé Doca", cidadeNormalizada: "ze doca", _count: { _all: 3 } },
      { cidade: "Águia Branca", cidadeNormalizada: "aguia branca", _count: { _all: 2 } },
      { cidade: "Barra Mansa", cidadeNormalizada: "barra mansa", _count: { _all: 9 } },
    ]);

    const municipios = await repo.listMunicipios("RJ");

    expect(municipios.map((m) => m.cidade)).toEqual(["Águia Branca", "Barra Mansa", "Zé Doca"]);
  });
});

/**
 * Credenciamento por município (24/09/2026) — a consulta que o
 * `CompanyServiceAreasService.credenciarMunicipio` dispara.
 *
 * Estes testes moraram no spec do serviço até a auditoria de
 * 26/09/2026 (item 5), quando o serviço deixou de falar com o Prisma
 * direto. A garantia que eles guardam não mudou de valor, só de
 * endereço: ela é sobre o `where` que vai ao banco, e o `where` agora
 * é escrito aqui.
 */
function criarRepositorioDeBusca(escolas: { id: string }[]) {
  const findMany = jest.fn().mockResolvedValue(escolas);
  const prisma = { school: { findMany } } as unknown as PrismaService;
  return { repo: new PrismaSchoolRepository(prisma), findMany };
}

describe("listActiveIdsNoMunicipio", () => {
  it("NÃO FALTAR — busca pelo município NORMALIZADO, não pelo texto digitado", async () => {
    // "Maricá" digitado pelo Admin contra "MARICA" vindo do INEP. Se o
    // `where` levasse o texto cru, metade do município ficaria de fora
    // em silêncio — e "0 escolas" é indistinguível de "a planilha não
    // tinha essa escola".
    const { repo, findMany } = criarRepositorioDeBusca([{ id: "e1" }, { id: "e2" }]);

    const ids = await repo.listActiveIdsNoMunicipio({
      cidade: "  Maricá ",
      estado: "rj",
      dependencias: [],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: "RJ",
          cidadeNormalizada: "marica",
          deletedAt: null,
          status: "ATIVA",
        }),
      }),
    );
    expect(ids).toEqual(["e1", "e2"]);
  });

  it("NÃO VARRE A UF INTEIRA — o filtro de município vai no banco", async () => {
    // Guarda contra a regressão que o usuário apontou em 24/09/2026:
    // "são mais de 100 mil [escolas], não é possível que o sistema não
    // aguenta". A versão anterior carregava toda a UF em memória para
    // comparar o nome em JavaScript — em SP, ~50 mil linhas por clique.
    const { repo, findMany } = criarRepositorioDeBusca([]);

    await repo.listActiveIdsNoMunicipio({ cidade: "Maricá", estado: "RJ", dependencias: [] });

    const where = findMany.mock.calls[0][0].where;
    expect(where.cidadeNormalizada).toBeDefined();
    // E só os ids saem do banco: o chamador cruza ids, nunca precisa
    // da escola inteira.
    expect(findMany.mock.calls[0][0].select).toEqual({ id: true });
  });

  it("lista de redes vazia não vira filtro — significa TODAS as redes", async () => {
    const { repo, findMany } = criarRepositorioDeBusca([]);

    await repo.listActiveIdsNoMunicipio({ cidade: "Maricá", estado: "RJ", dependencias: [] });

    expect(findMany.mock.calls[0][0].where.dependenciaAdministrativa).toBeUndefined();
  });

  it("lista de redes preenchida filtra por elas", async () => {
    const { repo, findMany } = criarRepositorioDeBusca([]);

    await repo.listActiveIdsNoMunicipio({
      cidade: "Maricá",
      estado: "RJ",
      dependencias: ["MUNICIPAL", "ESTADUAL"],
    });

    expect(findMany.mock.calls[0][0].where.dependenciaAdministrativa).toEqual({
      in: ["MUNICIPAL", "ESTADUAL"],
    });
  });
});
