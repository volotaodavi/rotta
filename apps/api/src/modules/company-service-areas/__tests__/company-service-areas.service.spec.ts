import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { CompanyServiceAreasService } from "../company-service-areas.service";

import type { CompanyServiceAreaRepository } from "../repositories/company-service-area.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { CompanyTagsService } from "@/modules/companies/company-tags.service";
import type { SchoolCompanyLinkRepository } from "@/modules/schools/repositories/school-company-link.repository";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
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
 *
 * O `where` que vai ao banco na busca do município deixou de ser
 * assunto daqui na auditoria de 26/09/2026 (item 5), quando o serviço
 * passou a falar com repositórios. Os dois testes que guardavam a
 * normalização e o "não varre a UF inteira" migraram para
 * `schools/__tests__/prisma-school.repository.municipios.spec.ts`, onde
 * o `where` agora é escrito — nenhuma garantia foi perdida, só mudou
 * de endereço.
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

type Cerca = {
  cidade: string | null;
  estado: string | null;
  schoolId: string | null;
  dependencias: string[];
};

function criarServico(
  cercas: Cerca[] = [],
  escolasDoMunicipio: string[] = [],
  jaVinculadas: string[] = [],
) {
  const listCercasByCompany = jest.fn().mockResolvedValue(cercas);
  const listByCompany = jest.fn().mockResolvedValue([]);
  const listCidadesByCompanyAndEstado = jest
    .fn()
    .mockResolvedValue(cercas.map((cerca) => cerca.cidade));
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
  const deleteByIdAndCompany = jest.fn().mockResolvedValue(undefined);
  const areas = {
    create,
    listByCompany,
    listCercasByCompany,
    listCidadesByCompanyAndEstado,
    deleteByIdAndCompany,
  } as unknown as CompanyServiceAreaRepository;

  const listActiveIdsNoMunicipio = jest.fn().mockResolvedValue(escolasDoMunicipio);
  const schools = { listActiveIdsNoMunicipio } as unknown as SchoolRepository;

  const listActiveSchoolIdsByCompany = jest.fn().mockResolvedValue(jaVinculadas);
  const createManyEmLotes = jest.fn().mockResolvedValue(undefined);
  const schoolLinks = {
    listActiveSchoolIdsByCompany,
    createManyEmLotes,
  } as unknown as SchoolCompanyLinkRepository;

  // Empresa LICITADA por padrão: área de atuação é da vertente
  // pública, e é esse o caso normal destes testes.
  const companyTagsService = {
    assertTag: jest.fn().mockResolvedValue(undefined),
    temTag: jest.fn().mockResolvedValue(true),
  } as unknown as CompanyTagsService;

  return {
    service: new CompanyServiceAreasService(areas, schools, schoolLinks, companyTagsService),
    companyTagsService,
    listByCompany,
    listCercasByCompany,
    create,
    deleteByIdAndCompany,
    listActiveIdsNoMunicipio,
    createManyEmLotes,
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

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ estado: "RJ" }));
  });

  it("apagar área filtra pelo companyId junto do id", async () => {
    // Os dois ids juntos: um id de outra empresa não apaga nada, em
    // vez de apagar a área errada (o `deleteMany` que garante isso
    // está no repositório).
    const { service, deleteByIdAndCompany } = criarServico();

    await service.remover("company-1", "area-9", adminActor);

    expect(deleteByIdAndCompany).toHaveBeenCalledWith("area-9", "company-1");
  });
});

describe("quem lê a cerca", () => {
  it("a própria empresa vê a própria área — precisa entender por que foi recusada", async () => {
    const { service, listByCompany } = criarServico([]);

    await service.listar("company-1", empresaActor);

    expect(listByCompany).toHaveBeenCalledWith("company-1");
  });

  it("ninguém vê a área de outra empresa", async () => {
    const { service, listByCompany } = criarServico([]);

    await expect(service.listar("company-9", empresaActor)).rejects.toThrow(ForbiddenException);
    expect(listByCompany).not.toHaveBeenCalled();
  });
});

/**
 * Credenciamento por município (24/09/2026).
 *
 * O pedido do usuário terminava em cinco palavras que viraram os testes
 * deste bloco: "não deverá inventar ou faltar".
 */
describe("credenciar município inteiro", () => {
  const escolasDeMarica = ["e1", "e2"];

  it("passa a cidade e a UF adiante — quem normaliza é o repositório", async () => {
    // "Maricá" digitado pelo Admin contra "MARICA" vindo do INEP. O
    // `where` normalizado é guardado no spec do repositório; aqui o
    // que importa é que o serviço não engula nem reescreva o que o
    // Admin escolheu.
    const { service, listActiveIdsNoMunicipio, createManyEmLotes } = criarServico(
      [],
      escolasDeMarica,
      [],
    );

    const resultado = await service.credenciarMunicipio(
      "company-1",
      { cidade: "  Maricá ", estado: "rj" },
      adminActor,
    );

    expect(listActiveIdsNoMunicipio).toHaveBeenCalledWith({
      cidade: "Maricá",
      estado: "RJ",
      dependencias: [],
    });
    expect(resultado.encontradas).toBe(2);
    expect(resultado.credenciadas).toBe(2);
    const criados = createManyEmLotes.mock.calls[0][0];
    expect(criados.map((v: { schoolId: string }) => v.schoolId).sort()).toEqual(["e1", "e2"]);
  });

  it("NÃO INVENTAR — nunca cria escola, só vincula as que já existem", async () => {
    const { service, createManyEmLotes } = criarServico([], [], []);

    const resultado = await service.credenciarMunicipio(
      "company-1",
      { cidade: "Maricá", estado: "RJ" },
      adminActor,
    );

    expect(resultado.encontradas).toBe(0);
    expect(resultado.credenciadas).toBe(0);
    expect(createManyEmLotes).toHaveBeenCalledWith([]);
  });

  it("reexecutar é seguro — o que já estava vinculado não duplica", async () => {
    // O vínculo vigente de `e1` vem da consulta de vínculos da empresa,
    // que traz TODOS (a lista é limitada pelo tamanho da
    // transportadora) em vez de um `IN` com milhares de UUIDs.
    const { service, createManyEmLotes } = criarServico([], escolasDeMarica, ["e1"]);

    const resultado = await service.credenciarMunicipio(
      "company-1",
      { cidade: "Maricá", estado: "RJ" },
      adminActor,
    );

    expect(resultado.jaCredenciadas).toBe(1);
    expect(resultado.credenciadas).toBe(1);
    const criados = createManyEmLotes.mock.calls[0][0];
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
      expect.objectContaining({ cidade: "Maricá", estado: "RJ" }),
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
    const { service, createManyEmLotes } = criarServico([], escolasDeMarica, []);

    await expect(
      service.credenciarMunicipio("company-1", { cidade: "Maricá", estado: "RJ" }, empresaActor),
    ).rejects.toThrow(ForbiddenException);
    expect(createManyEmLotes).not.toHaveBeenCalled();
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
    const { service, createManyEmLotes, companyTagsService } = criarServico([], ["e1"], []);
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("Credenciar um município inteiro depende da habilitação..."),
    );

    await expect(
      service.credenciarMunicipio("company-1", { cidade: "Maricá", estado: "RJ" }, adminActor),
    ).rejects.toThrow(ForbiddenException);
    expect(createManyEmLotes).not.toHaveBeenCalled();
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
    const { service, listByCompany, companyTagsService } = criarServico([]);
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("sem tag"),
    );

    await expect(service.listar("company-1", adminActor)).resolves.toEqual([]);
    expect(listByCompany).toHaveBeenCalled();
  });

  it("APAGAR a cerca continua liberado mesmo sem a tag", async () => {
    // Se o Admin tirou a tag LICITADA, ele ainda precisa poder limpar
    // as áreas que sobraram. Bloquear prenderia a cerca no lugar, sem
    // ninguém para abri-la.
    const { service, deleteByIdAndCompany, companyTagsService } = criarServico();
    (companyTagsService.assertTag as jest.Mock).mockRejectedValue(
      new ForbiddenException("sem tag"),
    );

    await expect(service.remover("company-1", "area-9", adminActor)).resolves.toBeUndefined();
    expect(deleteByIdAndCompany).toHaveBeenCalled();
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
