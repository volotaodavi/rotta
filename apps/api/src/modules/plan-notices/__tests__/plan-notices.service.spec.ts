import { PlanNoticesService } from "../plan-notices.service";

import type {
  PlanNoticeRepository,
  PlanNoticeWithRelations,
} from "../repositories/plan-notice.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { Role } from "@/shared/enums";

function buildNotice(overrides: Partial<PlanNoticeWithRelations> = {}): PlanNoticeWithRelations {
  return {
    id: "notice-1",
    titulo: "Promoção de lançamento",
    corpo: "20% de desconto no segundo mês para quem assinar até sexta.",
    companyId: null,
    ativo: true,
    criadoPorUserId: "admin-1",
    criadoPor: { id: "admin-1", nome: "Admin Rotta" },
    company: null,
    createdAt: new Date(),
    ...overrides,
  };
}

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-1",
};

describe("PlanNoticesService", () => {
  let service: PlanNoticesService;
  let repository: jest.Mocked<PlanNoticeRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      list: jest.fn(),
      setAtivo: jest.fn(),
      listActiveForCompany: jest.fn(),
    };
    service = new PlanNoticesService(repository);
  });

  it("cria um aviso global quando companyId não é informado", async () => {
    repository.create.mockResolvedValue(buildNotice());

    await service.create(
      { titulo: "Promoção de lançamento", corpo: "20% de desconto." },
      adminActor,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: null, criadoPorUserId: "admin-1" }),
    );
  });

  it("cria um aviso específico quando companyId é informado", async () => {
    repository.create.mockResolvedValue(buildNotice({ companyId: "company-1" }));

    await service.create(
      { titulo: "Atenção", corpo: "Seu boleto vence amanhã.", companyId: "company-1" },
      adminActor,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: "company-1" }),
    );
  });

  it("lista avisos paginados", async () => {
    repository.list.mockResolvedValue({ items: [buildNotice()], total: 1 });

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("ativa e desativa um aviso", async () => {
    repository.setAtivo.mockResolvedValue(buildNotice({ ativo: false }));

    const result = await service.setAtivo("notice-1", false);

    expect(repository.setAtivo).toHaveBeenCalledWith("notice-1", false);
    expect(result.ativo).toBe(false);
  });

  it("lista avisos ativos globais + da própria empresa", async () => {
    repository.listActiveForCompany.mockResolvedValue([
      buildNotice({ id: "global-1", companyId: null }),
      buildNotice({
        id: "specific-1",
        companyId: "company-1",
        company: { id: "company-1", nomeFantasia: "Transportadora X" },
      }),
    ]);

    const result = await service.listActiveForCompany("company-1");

    expect(result).toHaveLength(2);
    expect(result.find((notice) => notice.id === "specific-1")?.companyNomeFantasia).toBe(
      "Transportadora X",
    );
  });
});
