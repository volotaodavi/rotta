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
