import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { CompanyServiceAreasService } from "../company-service-areas.service";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
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

function criarServico(areas: unknown[] = []) {
  const findMany = jest.fn().mockResolvedValue(areas);
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
  } as unknown as PrismaService;

  return { service: new CompanyServiceAreasService(prisma), findMany, create, deleteMany };
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
