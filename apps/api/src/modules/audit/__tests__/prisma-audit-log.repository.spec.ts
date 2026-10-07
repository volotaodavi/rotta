import { PrismaAuditLogRepository } from "../repositories/prisma-audit-log.repository";

import type { PrismaService } from "@/infra/database/prisma.service";

function buildPrisma() {
  const create = jest.fn().mockReturnValue("create-op");
  const findMany = jest.fn().mockReturnValue("findMany-op");
  const count = jest.fn().mockReturnValue("count-op");
  const withTenant = jest.fn().mockResolvedValue("tenant-result");
  const withBypass = jest.fn().mockResolvedValue("bypass-result");
  const prisma = {
    auditLog: { create, findMany, count },
    withTenant,
    withBypass,
  } as unknown as PrismaService;
  return { prisma, create, findMany, count, withTenant, withBypass };
}

describe("PrismaAuditLogRepository", () => {
  it("grava com o tenant da requisição quando o registro tem companyId", async () => {
    const { prisma, create, withTenant, withBypass } = buildPrisma();
    const repository = new PrismaAuditLogRepository(prisma);

    await repository.record({
      companyId: "company-1",
      entidadeTipo: "Vehicle",
      entidadeId: "vehicle-1",
      acao: "UPDATE",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: "company-1", entidadeId: "vehicle-1" }),
    });
    expect(withTenant).toHaveBeenCalledWith("create-op");
    expect(withBypass).not.toHaveBeenCalled();
  });

  it("grava com bypass quando o ator não tem empresa (Responsável, Admin Rotta em catálogo compartilhado)", async () => {
    const { prisma, withTenant, withBypass } = buildPrisma();
    const repository = new PrismaAuditLogRepository(prisma);

    await repository.record({ entidadeTipo: "School", entidadeId: "school-1", acao: "UPDATE" });

    expect(withBypass).toHaveBeenCalledWith("create-op");
    expect(withTenant).not.toHaveBeenCalled();
  });

  it("lista por empresa SEMPRE filtrando pelo companyId e sob o tenant, nunca com bypass", async () => {
    const { prisma, findMany, withTenant, withBypass } = buildPrisma();
    const repository = new PrismaAuditLogRepository(prisma);

    await repository.list({ companyId: "company-1", entidadeTipo: "Route", page: 3, pageSize: 10 });

    expect(findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", entidadeTipo: "Route" },
      orderBy: { createdAt: "desc" },
      skip: 20,
      take: 10,
    });
    expect(withTenant).toHaveBeenCalledTimes(2);
    expect(withBypass).not.toHaveBeenCalled();
  });

  it("lista a trilha de catálogo compartilhado com bypass e filtra só pela entidade", async () => {
    const { prisma, findMany, withTenant, withBypass } = buildPrisma();
    const repository = new PrismaAuditLogRepository(prisma);

    await repository.listByEntity({
      entidadeTipo: "School",
      entidadeId: "school-1",
      page: 1,
      pageSize: 20,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { entidadeTipo: "School", entidadeId: "school-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
    expect(withBypass).toHaveBeenCalledTimes(2);
    expect(withTenant).not.toHaveBeenCalled();
  });
});
