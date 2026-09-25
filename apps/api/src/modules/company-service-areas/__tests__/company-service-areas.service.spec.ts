import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { CompanyServiceAreasService } from "../company-service-areas.service";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { CompanyTagsService } from "@/modules/companies/company-tags.service";
import type { School } from "@prisma/client";

import { Role } from "@/shared/enums";

/**
 * Cerca de atuação do transporte público (22/09/2026).
 *
 * Dois grupos de teste, e os dois existem por motivos diferentes:
 *
 * 1. **Aditividade** — empresa sem área cadastrada tem de continuar
 *    podendo se credenciar em qualquer escola. É a garantia de que o
 *    fluxo privado de hoje não quebrou. Se este teste cair, TODA a base
 *    atual parou de conseguir credenciar escola.
 * 2. **A cerca em si** — inclusive o caso do acento, que é o que
 *    separa uma transportadora do credenciamento na prática: "Maricá"
 *    digitado pelo Admin contra "MARICA" vindo da planilha do INEP.
 */

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-admin",
};

const empresaActor: AuthenticatedUser = {
  sub: "user-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

function escola(overrides: Partial<School> = {}): School {
  return {
    id: "escola-1",
    cidade: "Maricá",
    estado: "RJ",
    dependenciaAdministrativa: "MUNICIPAL",
    ...overrides,
  } as School;
}

function criarServico(areas: unknown[] = [], escolas: unknown[] = [], vinculos: unknown[] = []) {
  const findMany = jest.fn().mockResolvedValue(areas);
  const schoolFindMany = jest.fn().mockResolvedValue(escolas);
  const linkFindMany = jest.fn().mockResolvedValue(vinculos);
  const linkCreateMany = jest.fn().mockResolvedValue({ count: 0 });
  const create = jest.fn().mockResolvedValue({
    id: "area-1",
    companyId: "company-1",
    cidade: "Maricá",
    estado: "RJ",
    schoolId: null,
    dependencias: [],
    createdAt: new Date("2026-09-22T12:00:00Z"),
    school: null,
  });
  const deleteMany = jest.fn().mockResolvedValue({ count: 1 });

  const prisma = {
    withBypass: jest.fn((op: unknown) => op),
    companyServiceArea: { findMany, create, deleteMany },
    school: { findMany: schoolFindMany },
    schoolCompanyLink: { findMany: linkFindMany, createMany: linkCreateMany },
  } as unknown as PrismaService;

  // Empresa LICITADA por padrão: área de atuação é da vertente
  // pública, e é esse o caso normal destes testes.
  const companyTagsService = {
    assertTag: jest.fn().mockResolvedValue(undefined),
    temTag: jest.fn().mockResolvedValue(true),
  } as unknown as CompanyTagsService;

  return {
    service: new CompanyServiceAreasService(prisma, companyTagsService),
    companyTagsService,
    findMany,
    create,
    deleteMany,
    schoolFindMany,
    linkCreateMany,
  };
}

describe("aditividade — o fluxo privado não pode ter quebrado", () => {
  it("empresa SEM área cadastrada se credencia em qualquer escola", async () => {
    // Esta é a linha que torna a vertente pública aditiva. Se cair,
    // toda transportadora que já usa o sistema parou de credenciar.
    const { service } = criarServico([]);

    await expect(service.assertPodeCredenciar("company-1", escola())).resolves.toBeUndefined();
  });
});

describe("a cerca", () => {
  it("libera escola do município da área", async () => {
    const { service } = criarServico([
      { cidade: "Maricá", estado: "RJ", schoolId: null, dependencias: [] },
    ]);

    await expect(service.assertPodeCredenciar("company-1", escola())).resolves.toBeUndefined();
  });

  it("recusa escola de outro município", async () => {
    const { service } = criarServico([
      { cidade: "Niterói", estado: "RJ", schoolId: null, dependencias: [] },
    ]);

    await expect(service.assertPodeCredenciar("company-1", escola())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("acento e caixa não podem separar a transportadora da escola", async () => {
    // "MARICA" é como o nome costuma chegar da planilha do INEP;
    // "Maricá" é como o Admin digita. Sem normalizar, o credenciamento
    // falharia sem ninguém entender por quê.
    const { service } = criarServico([
      { cidade: "MARICA", estado: "rj", schoolId: null, dependencias: [] },
    ]);

    await expect(service.assertPodeCredenciar("company-1", escola())).resolves.toBeUndefined();
  });

  it("filtro de rede recusa escola privada numa área só de rede pública", async () => {
    const { service } = criarServico([
      { cidade: "Maricá", estado: "RJ", schoolId: null, dependencias: ["MUNICIPAL", "ESTADUAL"] },
    ]);

    await expect(
      service.assertPodeCredenciar("company-1", escola({ dependenciaAdministrativa: "PRIVADA" })),
    ).rejects.toThrow(ForbiddenException);
  });

  it("lista de redes vazia significa TODAS as redes daquele município", async () => {
    const { service } = criarServico([
      { cidade: "Maricá", estado: "RJ", schoolId: null, dependencias: [] },
    ]);

    await expect(
      service.assertPodeCredenciar("company-1", escola({ dependenciaAdministrativa: "PRIVADA" })),
    ).resolves.toBeUndefined();
  });

  it("área de escola específica libera só aquela escola", async () => {
    const { service } = criarServico([
      { cidade: null, estado: null, schoolId: "escola-1", dependencias: [] },
    ]);

    await expect(service.assertPodeCredenciar("company-1", escola())).resolves.toBeUndefined();
    await expect(
      service.assertPodeCredenciar("company-1", escola({ id: "escola-2" })),
    ).rejects.toThrow(ForbiddenException);
  });

  it("basta UMA área servir — as áreas somam, não se restringem", async () => {
    const { service } = criarServico([
      { cidade: "Niterói", estado: "RJ", schoolId: null, dependencias: [] },
      { cidade: "Maricá", estado: "RJ", schoolId: null, dependencias: [] },
    ]);

    await expect(service.assertPodeCredenciar("company-1", escola())).resolves.toBeUndefined();
  });
});

describe("quem escreve a cerca", () => {
  it("só Admin Rotta cadastra área", async () => {
    const { service, create } = criarServico();

    await expect(
      service.criar("company-1", { cidade: "Maricá", estado: "RJ" }, empresaActor),
    ).rejects.toThrow(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it("recusa área sem alvo nenhum — cerca que não cerca nada", async () => {
    const { service, create } = criarServico();

    await expect(service.criar("company-1", {}, adminActor)).rejects.toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("recusa área com município E escola — ambígua sobre qual vale", async () => {
    const { service, create } = criarServico();

    await expect(
      service.criar(
        "company-1",
        { cidade: "Maricá", estado: "RJ", schoolId: "escola-1" },
        adminActor,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("normaliza a UF para maiúsculas ao gravar", async () => {
    const { service, create } = criarServico();

    await service.criar("company-1", { cidade: "Maricá", estado: "rj" }, adminActor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: "RJ" }) }),
    );
  });

  it("apagar área filtra pelo companyId junto do id", async () => {
    // `deleteMany` com os dois no `where`: um id de outra empresa não
    // apaga nada, em vez de apagar a área errada.
    const { service, deleteMany } = criarServico();

    await service.remover("company-1", "area-9", adminActor);

    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "area-9", companyId: "company-1" } });
  });
});

describe("quem lê a cerca", () => {
  it("a própria empresa vê a própria área — precisa entender por que foi recusada", async () => {
    const { service, findMany } = criarServico([]);

    await service.listar("company-1", empresaActor);

    expect(findMany).toHaveBeenCalled();
  });

  it("ninguém vê a área de outra empresa", async () => {
    const { service, findMany } = criarServico([]);

    await expect(service.listar("company-9", empresaActor)).rejects.toThrow(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });
});

/**
 * Credenciamento por município (24/09/2026).
 *
 * O pedido do usuário terminava em cinco palavras que viraram os testes
 * deste bloco: "não deverá inventar ou faltar".
 */
describe("credenciar município inteiro", () => {
  // O que o BANCO devolve — já filtrado pelo `where`, porque desde a
  // migration `20260924210000_municipio_indexado` a comparação de
  // município é indexada e não acontece mais em memória.
  const escolasDeMarica = [{ id: "e1" }, { id: "e2" }];

  it("NÃO FALTAR — busca pelo município NORMALIZADO, não pelo texto digitado", async () => {
    // "Maricá" digitado pelo Admin contra "MARICA" vindo do INEP. Se o
    // `where` levasse o texto cru, metade do município ficaria de fora
    // em silêncio — e "0 escolas" é indistinguível de "a planilha não
    // tinha essa escola".
    const { service, schoolFindMany, linkCreateMany } = criarServico([], escolasDeMarica, []);

    const resultado = await service.credenciarMunicipio(
      "company-1",
      { cidade: "  Maricá ", estado: "rj" },
      adminActor,
    );

    expect(schoolFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: "RJ", cidadeNormalizada: "marica" }),
      }),
    );
    expect(resultado.encontradas).toBe(2);
    expect(resultado.credenciadas).toBe(2);
    const criados = linkCreateMany.mock.calls[0][0].data;
    expect(criados.map((v: { schoolId: string }) => v.schoolId).sort()).toEqual(["e1", "e2"]);
  });

  it("NÃO VARRE A UF INTEIRA — o filtro de município vai no banco", async () => {
    // Guarda contra a regressão que o usuário apontou em 24/09/2026:
    // "são mais de 100 mil [escolas], não é possível que o sistema não
    // aguenta". A versão anterior carregava toda a UF em memória para
    // comparar o nome em JavaScript — em SP, ~50 mil linhas por clique.
    const { service, schoolFindMany } = criarServico([], escolasDeMarica, []);

    await service.credenciarMunicipio("company-1", { cidade: "Maricá", estado: "RJ" }, adminActor);

    const where = schoolFindMany.mock.calls[0][0].where;
    expect(where.cidadeNormalizada).toBeDefined();
  });

  it("NÃO INVENTAR — nunca cria escola, só vincula as que já existem", async () => {
    const { service, linkCreateMany } = criarServico([], [], []);

    const resultado = await service.credenciarMunicipio(
      "company-1",
      { cidade: "Maricá", estado: "RJ" },
      adminActor,
    );

    expect(resultado.encontradas).toBe(0);
    expect(resultado.credenciadas).toBe(0);
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it("reexecutar é seguro — o que já estava vinculado não duplica", async () => {
    // O vínculo vigente de `e1` vem da consulta de vínculos da empresa,
    // que traz TODOS (a lista é limitada pelo tamanho da
    // transportadora) em vez de um `IN` com milhares de UUIDs.
    const { service, linkCreateMany } = criarServico([], escolasDeMarica, [{ schoolId: "e1" }]);

    const resultado = await service.credenciarMunicipio(
      "company-1",
      { cidade: "Maricá", estado: "RJ" },
      adminActor,
    );

    expect(resultado.jaCredenciadas).toBe(1);
    expect(resultado.credenciadas).toBe(1);
    const criados = linkCreateMany.mock.calls[0][0].data;
    expect(criados).toHaveLength(1);
    expect(criados[0].schoolId).toBe("e2");
  });

  it("registra a área de atuação junto — credenciar e delimitar são o mesmo gesto", async () => {
    // Sem isto, a empresa sairia credenciada nas escolas de hoje mas
    // sem cerca nenhuma, livre para se credenciar em qualquer escola do
    // país amanhã.
    const { service, create } = criarServico([], escolasDeMarica, []);

    const resultado = await service.credenciarMunicipio(
      "company-1",
      { cidade: "Maricá", estado: "RJ" },
      adminActor,
    );

    expect(resultado.areaDeAtuacaoRegistrada).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cidade: "Maricá", estado: "RJ" }),
      }),
    );
  });

  it("não duplica a área de atuação ao rodar duas vezes", async () => {
    const { service, create } = criarServico(
      [{ cidade: "MARICA", estado: "RJ", schoolId: null, dependencias: [] }],
      escolasDeMarica,
      [],
    );

    await service.credenciarMunicipio("company-1", { cidade: "Maricá", estado: "RJ" }, adminActor);

    expect(create).not.toHaveBeenCalled();
  });

  it("só Admin Rotta credencia município", async () => {
    const { service, linkCreateMany } = criarServico([], escolasDeMarica, []);

    await expect(
      service.credenciarMunicipio("company-1", { cidade: "Maricá", estado: "RJ" }, empresaActor),
    ).rejects.toThrow(ForbiddenException);
    expect(linkCreateMany).not.toHaveBeenCalled();
  });
});

/**
 * Área de atuação é da vertente LICITADA (25/09/2026).
 *
 * Delimitar um município e credenciar as escolas dele de uma vez é o
 * gesto do contrato público. Numa empresa só particular isso não faz
 * sentido: ela encontra as escolas pelo Marketplace, uma a uma,
 * conforme as famílias a contratam.
 */
describe("área de atuação só existe com a habilitação LICITADA", () => {
  it("recusa credenciar município numa empresa sem a tag", async () => {
    const { service, linkCreateMany, companyTagsService } = criarServico([], [{ id: "e1" }], []);
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("Credenciar um município inteiro depende da habilitação..."),
    );

    await expect(
      service.credenciarMunicipio("company-1", { cidade: "Maricá", estado: "RJ" }, adminActor),
    ).rejects.toThrow(ForbiddenException);
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it("recusa cadastrar área numa empresa sem a tag", async () => {
    const { service, create, companyTagsService } = criarServico();
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("Definir área de atuação depende da habilitação..."),
    );

    await expect(
      service.criar("company-1", { cidade: "Maricá", estado: "RJ" }, adminActor),
    ).rejects.toThrow(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it("LER a cerca continua liberado mesmo sem a tag", async () => {
    // A empresa precisa enxergar a própria cerca para entender por que
    // um credenciamento foi recusado — inclusive depois de perder a
    // habilitação. Bloquear a leitura esconderia a explicação.
    const { service, findMany, companyTagsService } = criarServico([]);
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("sem tag"),
    );

    await expect(service.listar("company-1", adminActor)).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalled();
  });

  it("APAGAR a cerca continua liberado mesmo sem a tag", async () => {
    // Se o Admin tirou a tag LICITADA, ele ainda precisa poder limpar
    // as áreas que sobraram. Bloquear prenderia a cerca no lugar, sem
    // ninguém para abri-la.
    const { service, deleteMany, companyTagsService } = criarServico();
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("sem tag"),
    );

    await expect(service.remover("company-1", "area-9", adminActor)).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalled();
  });

  it("o guard de credenciamento de escola NÃO depende da tag", async () => {
    // `assertPodeCredenciar` é chamado por `SchoolsService.linkCompany`
    // em TODA empresa. Se dependesse da tag LICITADA, toda
    // transportadora particular pararia de credenciar escola.
    const { service, companyTagsService } = criarServico([]);
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("sem tag"),
    );

    await expect(service.assertPodeCredenciar("company-1", escola())).resolves.toBeUndefined();
  });
});
