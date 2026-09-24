import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { RouteAssignmentsService } from "../route-assignments.service";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";

import { Role } from "@/shared/enums";

/**
 * Escala do dia (24/09/2026).
 *
 * Três coisas são guardadas aqui, e cada uma corresponde a um jeito
 * real de errar:
 *
 * 1. **Upsert, não insert.** Designar a mesma rota no mesmo dia é
 *    EDITAR. Se virasse uma segunda escala, haveria duas intenções
 *    conflitantes para o mesmo dia e o rastreador teria de adivinhar.
 * 2. **Rota e ônibus têm de ser da empresa do ator.** A RLS não pega
 *    este caso: o `companyId` gravado seria o do ator, então uma rota
 *    de outra transportadora entraria no tenant errado.
 * 3. **Data truncada em UTC.** Sem truncar, o despachante que escala
 *    às 21h de Brasília grava o dia seguinte — a escala de amanhã
 *    viraria a de depois de amanhã.
 */

const empresaActor: AuthenticatedUser = {
  sub: "user-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

const escalaGravada = {
  id: "escala-1",
  data: new Date("2026-09-25T00:00:00.000Z"),
  routeId: "rota-1",
  veiculoId: "veiculo-1",
  motoristaId: "motorista-1",
  monitorId: null,
  observacao: null,
  route: { nome: "Rota Centro", turno: "MANHA" },
  veiculo: { numeroFrota: "412", placa: "ABC1D23" },
  motorista: { nome: "João Silva" },
  monitor: null,
};

function criarServico(opcoes: { rota?: unknown; veiculo?: unknown } = {}) {
  const routeFindFirst = jest
    .fn()
    .mockResolvedValue(opcoes.rota === undefined ? { id: "rota-1" } : opcoes.rota);
  const vehicleFindFirst = jest
    .fn()
    .mockResolvedValue(opcoes.veiculo === undefined ? { id: "veiculo-1" } : opcoes.veiculo);
  const upsert = jest.fn().mockResolvedValue(escalaGravada);
  const findMany = jest.fn().mockResolvedValue([escalaGravada]);
  const deleteMany = jest.fn().mockResolvedValue({ count: 1 });

  const prisma = {
    withTenant: jest.fn((op: unknown) => op),
    route: { findFirst: routeFindFirst },
    vehicle: { findFirst: vehicleFindFirst },
    routeAssignment: { upsert, findMany, deleteMany },
  } as unknown as PrismaService;

  return { service: new RouteAssignmentsService(prisma), upsert, findMany, deleteMany };
}

const entrada = {
  routeId: "rota-1",
  data: "2026-09-25",
  veiculoId: "veiculo-1",
  motoristaId: "motorista-1",
};

describe("designar é upsert, nunca uma segunda escala", () => {
  it("grava por [routeId, data] — designar de novo EDITA", async () => {
    // É assim que o despachante troca o motorista às 5h da manhã: o
    // gesto é o mesmo de designar.
    const { service, upsert } = criarServico();

    await service.definir(entrada, empresaActor);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { routeId_data: { routeId: "rota-1", data: new Date("2026-09-25T00:00:00.000Z") } },
      }),
    );
  });

  it("trunca a data em UTC — escalar às 21h não empurra para o dia seguinte", async () => {
    const { service, upsert } = criarServico();

    await service.definir({ ...entrada, data: "2026-09-25T23:45:00.000Z" }, empresaActor);

    const gravado = upsert.mock.calls[0][0];
    expect(gravado.create.data.toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("observação em branco vira null, nunca string vazia", async () => {
    const { service, upsert } = criarServico();

    await service.definir({ ...entrada, observacao: "   " }, empresaActor);

    expect(upsert.mock.calls[0][0].create.observacao).toBeNull();
  });
});

describe("a escala nunca sai do tenant do ator", () => {
  it("recusa rota de outra transportadora", async () => {
    // A RLS não pega este caso: o `companyId` gravado seria o do ator,
    // então a rota alheia entraria no tenant errado.
    const { service, upsert } = criarServico({ rota: null });

    await expect(service.definir(entrada, empresaActor)).rejects.toThrow(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("recusa ônibus de outra transportadora", async () => {
    const { service, upsert } = criarServico({ veiculo: null });

    await expect(service.definir(entrada, empresaActor)).rejects.toThrow(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("recusa ator sem transportadora", async () => {
    const { service, upsert } = criarServico();
    const semTenant = { ...empresaActor, tenantId: null };

    await expect(service.definir(entrada, semTenant)).rejects.toThrow(ForbiddenException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("apagar filtra pelo companyId junto do id", async () => {
    const { service, deleteMany } = criarServico();

    await service.remover("escala-9", empresaActor);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "escala-9", companyId: "company-1" },
    });
  });
});

describe("o que a escala devolve para a tela", () => {
  it("identifica o ônibus pelo NÚMERO, com a placa como alternativa", async () => {
    // Mesma regra do Painel do Despachante: os dois públicos nunca veem
    // rótulos diferentes do mesmo carro.
    const { service } = criarServico();

    const escala = await service.definir(entrada, empresaActor);

    expect(escala.veiculoIdentificacao).toBe("412");
  });

  it("entrega a data em AAAA-MM-DD, sem hora", async () => {
    const { service } = criarServico();

    const escala = await service.definir(entrada, empresaActor);

    expect(escala.data).toBe("2026-09-25");
  });

  it("motorista vê só a PRÓPRIA escala, nunca a dos colegas", async () => {
    const { service, findMany } = criarServico();
    const motorista: AuthenticatedUser = {
      sub: "motorista-1",
      tenantId: "company-1",
      role: Role.MOTORISTA,
      vinculoId: "vinculo-m",
    };

    await service.minhasEscalas(motorista);

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ motoristaId: "motorista-1" }, { monitorId: "motorista-1" }]);
  });
});
