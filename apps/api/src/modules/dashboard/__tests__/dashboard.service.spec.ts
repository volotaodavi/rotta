import { DashboardService } from "../dashboard.service";

import type { DashboardRepository } from "../repositories/dashboard.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { Role } from "@/shared/enums";

function actor(role: Role, overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { sub: "user-1", tenantId: "tenant-1", role, vinculoId: "vinculo-1", ...overrides };
}

describe("DashboardService", () => {
  let repository: jest.Mocked<DashboardRepository>;
  let service: DashboardService;

  beforeEach(() => {
    repository = {
      getCompanyDashboard: jest.fn(),
      getDriverDashboard: jest.fn(),
      getResponsavelDashboard: jest.fn(),
    };
    service = new DashboardService(repository);
  });

  it("resolve o dashboard de Motorista com getDriverDashboard(actor.sub)", async () => {
    const data = {
      viagensHoje: { total: 2, emAndamento: 1, concluidas: 1, canceladas: 0 },
      documentosPendentesAnaliseIa: 1,
      documentosVencendoEm30Dias: 0,
    };
    repository.getDriverDashboard.mockResolvedValue(data);

    const result = await service.getForActor(actor(Role.MOTORISTA, { sub: "motorista-9" }));

    expect(result).toEqual({ perfil: "motorista", motorista: data });
    expect(repository.getDriverDashboard).toHaveBeenCalledWith("motorista-9");
  });

  it("resolve o dashboard de Monitor pela mesma via de Motorista", async () => {
    repository.getDriverDashboard.mockResolvedValue({
      viagensHoje: { total: 0, emAndamento: 0, concluidas: 0, canceladas: 0 },
      documentosPendentesAnaliseIa: 0,
      documentosVencendoEm30Dias: 0,
    });

    const result = await service.getForActor(actor(Role.MONITOR));

    expect(result.perfil).toBe("motorista");
  });

  it("resolve o dashboard de Responsável com getResponsavelDashboard(actor.sub), sem tenant", async () => {
    const data = { filhosTotal: 2, contratosAtivos: 2, contratosTotal: 3 };
    repository.getResponsavelDashboard.mockResolvedValue(data);

    const result = await service.getForActor(
      actor(Role.RESPONSAVEL, { sub: "responsavel-1", tenantId: null }),
    );

    expect(result).toEqual({ perfil: "responsavel", responsavel: data });
    expect(repository.getResponsavelDashboard).toHaveBeenCalledWith("responsavel-1");
  });

  it("lança erro para um papel sem dashboard definido em GET /dashboard/me (Empresa/Gestor usam GET /companies/:id/dashboard)", async () => {
    await expect(service.getForActor(actor(Role.EMPRESA))).rejects.toThrow(
      /não tem um dashboard definido/,
    );
    await expect(service.getForActor(actor(Role.ADMIN_ROTTA))).rejects.toThrow(
      /não tem um dashboard definido/,
    );
  });

  describe("getCompanyDashboardById", () => {
    it("delega ao repository com o companyId explícito (reusado por CompaniesService.getDashboard)", async () => {
      const data = {
        rotasAtivas: 8,
        rotasTotal: 10,
        viagensHoje: { total: 5, emAndamento: 2, concluidas: 3, canceladas: 0 },
        motoristasAtivos: 4,
        monitoresAtivos: 2,
        veiculosTotal: 6,
        alunosAtivos: 40,
        chamadosAbertos: 1,
        documentosVencendoEm7Dias: { motorista: 1, veiculo: 0 },
        receitaEstimadaCentavos: 400_000,
        contratosAtivos: 40,
      };
      repository.getCompanyDashboard.mockResolvedValue(data);

      const result = await service.getCompanyDashboardById("company-9");

      expect(result).toBe(data);
      expect(repository.getCompanyDashboard).toHaveBeenCalledWith("company-9");
    });
  });
});
