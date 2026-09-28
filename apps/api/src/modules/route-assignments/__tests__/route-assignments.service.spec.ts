import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { RouteAssignmentsService } from "../route-assignments.service";

import type { RouteAssignmentRepository } from "../repositories/route-assignment.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RouteRepository } from "@/modules/routes/repositories/route.repository";
import type { VehicleRepository } from "@/modules/vehicles/repositories/vehicle.repository";

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
  // `undefined` = o caso normal (rota/ônibus desta empresa). Passar
  // `null` simula "não existe"; passar um objeto com outro `companyId`
  // simula o de outra transportadora.
  const findRoute = jest
    .fn()
    .mockResolvedValue(
      opcoes.rota === undefined ? { id: "rota-1", companyId: "company-1" } : opcoes.rota,
    );
  const findVehicle = jest
    .fn()
    .mockResolvedValue(
      opcoes.veiculo === undefined ? { id: "veiculo-1", companyId: "company-1" } : opcoes.veiculo,
    );
  const definir = jest.fn().mockResolvedValue(escalaGravada);
  const listByData = jest.fn().mockResolvedValue([escalaGravada]);
  const listDaPessoaNoPeriodo = jest.fn().mockResolvedValue([escalaGravada]);
  const deleteByIdAndCompany = jest.fn().mockResolvedValue(undefined);

  const escalas = {
    definir,
    listByData,
    listDaPessoaNoPeriodo,
    deleteByIdAndCompany,
  } as unknown as RouteAssignmentRepository;
  const routes = { findById: findRoute } as unknown as RouteRepository;
  const vehicles = { findById: findVehicle } as unknown as VehicleRepository;

  return {
    service: new RouteAssignmentsService(escalas, routes, vehicles),
    definir,
    listDaPessoaNoPeriodo,
    deleteByIdAndCompany,
  };
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
    // O `upsert` por `[routeId, data]` em si é contrato do
    // repositório; o que se guarda aqui é que o serviço entrega a
    // chave certa — rota e dia truncado.
    const { service, definir } = criarServico();

    await service.definir(entrada, empresaActor);

    expect(definir).toHaveBeenCalledWith(
      expect.objectContaining({
        routeId: "rota-1",
        data: new Date("2026-09-25T00:00:00.000Z"),
        companyId: "company-1",
      }),
    );
  });

  it("trunca a data em UTC — escalar às 21h não empurra para o dia seguinte", async () => {
    const { service, definir } = criarServico();

    await service.definir({ ...entrada, data: "2026-09-25T23:45:00.000Z" }, empresaActor);

    expect(definir.mock.calls[0][0].data.toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("observação em branco vira null, nunca string vazia", async () => {
    const { service, definir } = criarServico();

    await service.definir({ ...entrada, observacao: "   " }, empresaActor);

    expect(definir.mock.calls[0][0].observacao).toBeNull();
  });
});

describe("a escala nunca sai do tenant do ator", () => {
  it("recusa rota que não existe", async () => {
    const { service, definir } = criarServico({ rota: null });

    await expect(service.definir(entrada, empresaActor)).rejects.toThrow(BadRequestException);
    expect(definir).not.toHaveBeenCalled();
  });

  it("recusa rota de OUTRA transportadora, mesmo existindo", async () => {
    // Defesa em profundidade: a RLS já filtraria por tenant no
    // repositório, mas se algum dia ela falhar, o `companyId` gravado
    // seria o do ator e a rota alheia entraria no tenant errado.
    const { service, definir } = criarServico({
      rota: { id: "rota-1", companyId: "company-9" },
    });

    await expect(service.definir(entrada, empresaActor)).rejects.toThrow(BadRequestException);
    expect(definir).not.toHaveBeenCalled();
  });

  it("recusa ônibus de outra transportadora", async () => {
    const { service, definir } = criarServico({
      veiculo: { id: "veiculo-1", companyId: "company-9" },
    });

    await expect(service.definir(entrada, empresaActor)).rejects.toThrow(BadRequestException);
    expect(definir).not.toHaveBeenCalled();
  });

  it("recusa ator sem transportadora", async () => {
    const { service, definir } = criarServico();
    const semTenant = { ...empresaActor, tenantId: null };

    await expect(service.definir(entrada, semTenant)).rejects.toThrow(ForbiddenException);
    expect(definir).not.toHaveBeenCalled();
  });

  it("apagar leva o companyId junto do id", async () => {
    const { service, deleteByIdAndCompany } = criarServico();

    await service.remover("escala-9", empresaActor);

    expect(deleteByIdAndCompany).toHaveBeenCalledWith("escala-9", "company-1");
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
    // O `OR` entre motoristaId e monitorId é contrato do repositório;
    // o que se guarda aqui é que o serviço pede a escala DE QUEM está
    // logado, nunca de um id vindo de fora.
    const { service, listDaPessoaNoPeriodo } = criarServico();
    const motorista: AuthenticatedUser = {
      sub: "motorista-1",
      tenantId: "company-1",
      role: Role.MOTORISTA,
      vinculoId: "vinculo-m",
    };

    await service.minhasEscalas(motorista);

    expect(listDaPessoaNoPeriodo).toHaveBeenCalledWith(
      "motorista-1",
      expect.any(Date),
      expect.any(Date),
    );
  });
});
