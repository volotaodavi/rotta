import { BackofficeService } from "../backoffice.service";

import type {
  BackofficeRepository,
  DashboardSummaryData,
} from "../repositories/backoffice.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompaniesService } from "@/modules/companies/companies.service";

import { Role } from "@/shared/enums";

function buildSummary(overrides: Partial<DashboardSummaryData> = {}): DashboardSummaryData {
  return {
    empresasPorStatus: { TRIAL: 2, ATIVO: 10, SUSPENSO: 1, CANCELADO: 0, INADIMPLENTE: 1 },
    empresasTotal: 14,
    motoristasAtivos: 30,
    monitoresAtivos: 12,
    veiculosTotal: 25,
    alunosTotal: 200,
    viagensHoje: 40,
    chamadosAbertos: 3,
    documentosMotoristaPendentes: 5,
    documentosVeiculoPendentes: 2,
    contratosAguardandoAssinatura: 4,
    ...overrides,
  };
}

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-1",
};

describe("BackofficeService", () => {
  let service: BackofficeService;
  let backofficeRepository: jest.Mocked<BackofficeRepository>;
  let companiesService: jest.Mocked<CompaniesService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    backofficeRepository = { getDashboardSummary: jest.fn(), listPendingApprovals: jest.fn() };
    companiesService = { findByIdOrThrow: jest.fn() } as unknown as jest.Mocked<CompaniesService>;
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;

    service = new BackofficeService(backofficeRepository, companiesService, auditLogService);
  });

  describe("getDashboard", () => {
    it("soma os 3 tipos de pendência em aprovacoesPendentesTotal", async () => {
      backofficeRepository.getDashboardSummary.mockResolvedValue(buildSummary());

      const result = await service.getDashboard();

      expect(result.aprovacoesPendentesTotal).toBe(5 + 2 + 4);
      expect(result.empresasTotal).toBe(14);
    });
  });

  describe("listApprovals", () => {
    it("delega ao repository com o limite informado", async () => {
      backofficeRepository.listPendingApprovals.mockResolvedValue({
        documentosMotorista: [],
        documentosVeiculo: [],
        contratos: [],
      });

      await service.listApprovals(50);

      expect(backofficeRepository.listPendingApprovals).toHaveBeenCalledWith(50);
    });
  });

  describe("accessAsSupport (ADM-01, RN-10)", () => {
    it("registra auditoria ANTES de retornar os dados da empresa", async () => {
      const company = { id: "company-1", nomeFantasia: "Transportes Silva" };
      companiesService.findByIdOrThrow.mockResolvedValue(company as never);

      const result = await service.accessAsSupport(
        "company-1",
        { motivo: "Chamado #123 — cliente não consegue emitir NF." },
        adminActor,
        { ip: "1.2.3.4" },
      );

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "Company",
          entidadeId: "company-1",
          acao: "ADMIN_ACCESSED_AS_SUPPORT",
          atorUserId: "admin-1",
          dadosDepois: { motivo: "Chamado #123 — cliente não consegue emitir NF." },
        }),
      );
      expect(result).toBe(company);
    });

    it("nunca retorna os dados da empresa se o registro de auditoria falhar (estrito, não best-effort)", async () => {
      const company = { id: "company-1", nomeFantasia: "Transportes Silva" };
      companiesService.findByIdOrThrow.mockResolvedValue(company as never);
      auditLogService.record.mockRejectedValue(new Error("db indisponível"));

      await expect(
        service.accessAsSupport("company-1", { motivo: "Motivo válido aqui." }, adminActor, {}),
      ).rejects.toThrow("db indisponível");
    });
  });
});
