import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

import { SchoolsService } from "../schools.service";

import type { SchoolAccessPointRepository } from "../repositories/school-access-point.repository";
import type { SchoolCompanyLinkRepository } from "../repositories/school-company-link.repository";
import type { SchoolRepository } from "../repositories/school.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { School, SchoolAccessPoint, SchoolCompanyLink } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildSchool(overrides: Partial<School> = {}): School {
  return {
    id: "school-1",
    codigoInterno: "ESC-000001",
    codigoInep: null,
    nomeOficial: "EMEF Professora Ana Souza",
    nomeFantasia: null,
    redeEnsino: null,
    dependenciaAdministrativa: "MUNICIPAL",
    cnpj: null,
    telefone: null,
    whatsapp: null,
    email: null,
    website: null,
    cep: "01310100",
    logradouro: "Avenida Paulista",
    numero: "1000",
    complemento: null,
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    pais: "Brasil",
    latitude: null,
    longitude: null,
    observacoesLocalizacao: null,
    tipos: ["FUNDAMENTAL"],
    turnosAtendidos: ["MANHA", "TARDE"],
    status: "ATIVA",
    origemCadastro: "MANUAL",
    criadoPorId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildAccessPoint(overrides: Partial<SchoolAccessPoint> = {}): SchoolAccessPoint {
  return {
    id: "point-1",
    schoolId: "school-1",
    tipo: "PONTO_EMBARQUE",
    nome: "Portão dos Alunos",
    descricao: null,
    latitude: -23.56 as unknown as SchoolAccessPoint["latitude"],
    longitude: -46.65 as unknown as SchoolAccessPoint["longitude"],
    observacoes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildLink(overrides: Partial<SchoolCompanyLink> = {}): SchoolCompanyLink {
  return {
    id: "link-1",
    schoolId: "school-1",
    companyId: "company-1",
    vinculadoEm: new Date(),
    desvinculadoEm: null,
    vinculadoPorId: "user-1",
    encerradoPorId: null,
    ...overrides,
  };
}

const empresaActor: AuthenticatedUser = {
  sub: "user-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-admin",
};

const motoristaActor: AuthenticatedUser = {
  sub: "motorista-1",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-motorista",
};

describe("SchoolsService", () => {
  let service: SchoolsService;
  let schoolRepository: jest.Mocked<SchoolRepository>;
  let accessPointRepository: jest.Mocked<SchoolAccessPointRepository>;
  let companyLinkRepository: jest.Mocked<SchoolCompanyLinkRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    schoolRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCodigoInep: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      listAllActive: jest.fn(),
      nextCodigoInternoSequence: jest.fn(),
    };
    accessPointRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      listBySchool: jest.fn(),
    };
    companyLinkRepository = {
      create: jest.fn(),
      findActiveByCompanyAndSchool: jest.fn(),
      encerra: jest.fn(),
      listActiveByCompany: jest.fn(),
      findActiveForSchool: jest.fn(),
    };
    auditLogService = {
      record: jest.fn(),
      listByCompany: jest.fn(),
      listByEntity: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new SchoolsService(
      schoolRepository,
      accessPointRepository,
      companyLinkRepository,
      auditLogService,
    );

    schoolRepository.nextCodigoInternoSequence.mockResolvedValue(1);
    schoolRepository.findByCodigoInep.mockResolvedValue(null);
    companyLinkRepository.findActiveForSchool.mockResolvedValue([]);
  });

  describe("create", () => {
    it("rejeita código INEP já cadastrado", async () => {
      schoolRepository.findByCodigoInep.mockResolvedValue(buildSchool());

      await expect(
        service.create(
          {
            codigoInep: "12345678",
            nomeOficial: "Escola X",
            dependenciaAdministrativa: "MUNICIPAL",
            cep: "01310100",
            logradouro: "Rua X",
            numero: "1",
            bairro: "Centro",
            cidade: "São Paulo",
            estado: "SP",
            tipos: ["FUNDAMENTAL"],
            turnosAtendidos: ["MANHA"],
          },
          empresaActor,
          {},
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("gera o código interno a partir da sequência e cria a escola como ATIVA", async () => {
      const created = buildSchool();
      schoolRepository.create.mockResolvedValue(created);
      companyLinkRepository.create.mockResolvedValue(buildLink());

      const result = await service.create(
        {
          nomeOficial: "EMEF Professora Ana Souza",
          dependenciaAdministrativa: "MUNICIPAL",
          cep: "01310100",
          logradouro: "Avenida Paulista",
          numero: "1000",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          estado: "SP",
          tipos: ["FUNDAMENTAL"],
          turnosAtendidos: ["MANHA", "TARDE"],
        },
        empresaActor,
        {},
      );

      expect(schoolRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          codigoInterno: "ESC-000001",
          status: "ATIVA",
          criadoPorId: "user-1",
        }),
      );
      expect(result.id).toBe(created.id);
    });

    it("vincula automaticamente a empresa do ator (Empresa/Gestor), nunca o Admin Rotta", async () => {
      schoolRepository.create.mockResolvedValue(buildSchool());
      companyLinkRepository.create.mockResolvedValue(buildLink());

      await service.create(
        {
          nomeOficial: "Escola Y",
          dependenciaAdministrativa: "PRIVADA",
          cep: "01310100",
          logradouro: "Rua Y",
          numero: "1",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
          tipos: ["MEDIO"],
          turnosAtendidos: ["NOITE"],
        },
        empresaActor,
        {},
      );
      expect(companyLinkRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1", vinculadoPorId: "user-1" }),
      );

      companyLinkRepository.create.mockClear();
      schoolRepository.create.mockResolvedValue(buildSchool({ id: "school-2" }));
      await service.create(
        {
          nomeOficial: "Escola Z",
          dependenciaAdministrativa: "ESTADUAL",
          cep: "01310100",
          logradouro: "Rua Z",
          numero: "1",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
          tipos: ["MEDIO"],
          turnosAtendidos: ["NOITE"],
        },
        adminActor,
        {},
      );
      expect(companyLinkRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("findByIdOrThrow", () => {
    it("lança 404 quando a escola não existe", async () => {
      schoolRepository.findById.mockResolvedValue(null);
      await expect(service.findByIdOrThrow("school-1", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("Motorista só vê a escola se sua empresa estiver vinculada (404, não 403, caso contrário)", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      companyLinkRepository.findActiveForSchool.mockResolvedValue([
        buildLink({ companyId: "outra-empresa" }),
      ]);

      await expect(service.findByIdOrThrow("school-1", motoristaActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("Motorista acessa a escola quando sua empresa está vinculada", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      companyLinkRepository.findActiveForSchool.mockResolvedValue([
        buildLink({ companyId: "company-1" }),
      ]);

      const result = await service.findByIdOrThrow("school-1", motoristaActor);
      expect(result.id).toBe("school-1");
    });

    it("Admin Rotta e Empresa acessam qualquer escola do catálogo compartilhado", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      await expect(service.findByIdOrThrow("school-1", adminActor)).resolves.toBeDefined();
      await expect(service.findByIdOrThrow("school-1", empresaActor)).resolves.toBeDefined();
    });
  });

  describe("update", () => {
    it("não faz nada quando nenhum campo mudou", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      await service.update("school-1", {}, empresaActor, {});
      expect(schoolRepository.update).not.toHaveBeenCalled();
    });

    it("rejeita trocar para um código INEP já usado por outra escola", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool({ codigoInep: null }));
      schoolRepository.findByCodigoInep.mockResolvedValue(
        buildSchool({ id: "school-2", codigoInep: "999" }),
      );

      await expect(
        service.update("school-1", { codigoInep: "999" }, empresaActor, {}),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("faz soft delete (nunca apaga fisicamente)", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      schoolRepository.update.mockResolvedValue(buildSchool({ deletedAt: new Date() }));

      await service.remove("school-1", empresaActor, {});
      expect(schoolRepository.update).toHaveBeenCalledWith("school-1", {
        deletedAt: expect.any(Date),
      });
    });
  });

  describe("list", () => {
    it("força o escopo por companyId do próprio ator para Motorista/Monitor", async () => {
      schoolRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.list(
        {
          page: 1,
          pageSize: 20,
          sortBy: "nomeOficial",
          sortOrder: "asc",
          companyId: "outra-empresa",
        },
        motoristaActor,
      );

      expect(schoolRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1" }),
      );
    });

    it("Admin Rotta pode filtrar por qualquer companyId informado", async () => {
      schoolRepository.list.mockResolvedValue({ items: [], total: 0 });
      await service.list(
        { page: 1, pageSize: 20, sortBy: "nomeOficial", sortOrder: "asc", companyId: "empresa-x" },
        adminActor,
      );
      expect(schoolRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "empresa-x" }),
      );
    });
  });

  describe("checkPossibleDuplicates", () => {
    it("encontra escolas com nome parecido na mesma cidade/estado", async () => {
      schoolRepository.list.mockResolvedValue({
        items: [
          buildSchool({ nomeOficial: "EMEF Ana Souza" }),
          buildSchool({ id: "school-2", nomeOficial: "Colégio Totalmente Diferente" }),
        ],
        total: 2,
      });

      const result = await service.checkPossibleDuplicates(
        "EMEF Professora Ana Souza",
        "São Paulo",
        "SP",
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.nomeOficial).toBe("EMEF Ana Souza");
    });
  });

  describe("getDashboard", () => {
    it("Admin Rotta sem companyId vê o catálogo inteiro (nunca exige companyId, diferente de Veículos)", async () => {
      schoolRepository.listAllActive.mockResolvedValue([
        buildSchool({ dependenciaAdministrativa: "MUNICIPAL" }),
        buildSchool({ id: "school-2", dependenciaAdministrativa: "PRIVADA" }),
      ]);

      const dashboard = await service.getDashboard(adminActor);
      expect(schoolRepository.listAllActive).toHaveBeenCalledWith(undefined);
      expect(dashboard.totalEscolas).toBe(2);
      expect(dashboard.escolasPublicas).toBe(1);
      expect(dashboard.escolasPrivadas).toBe(1);
    });

    it("Empresa/Gestor sempre escopados à própria empresa", async () => {
      schoolRepository.listAllActive.mockResolvedValue([buildSchool()]);
      await service.getDashboard(empresaActor, "outra-empresa");
      expect(schoolRepository.listAllActive).toHaveBeenCalledWith("company-1");
    });
  });

  describe("Portões e Pontos de Embarque", () => {
    it("cria um ponto de acesso vinculado à escola", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      accessPointRepository.create.mockResolvedValue(buildAccessPoint());

      const result = await service.createAccessPoint(
        "school-1",
        { tipo: "PONTO_EMBARQUE", nome: "Portão dos Alunos", latitude: -23.56, longitude: -46.65 },
        empresaActor,
        {},
      );
      expect(result.nome).toBe("Portão dos Alunos");
    });

    it("lança 404 ao atualizar um ponto que não pertence à escola informada", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      accessPointRepository.findById.mockResolvedValue(
        buildAccessPoint({ schoolId: "outra-escola" }),
      );

      await expect(
        service.updateAccessPoint("school-1", "point-1", { nome: "Novo nome" }, empresaActor, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("Vínculo Empresa<->Escola", () => {
    it("Admin Rotta precisa informar companyId explicitamente", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      await expect(service.linkCompany("school-1", {}, adminActor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejeita vincular uma empresa já vinculada", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      companyLinkRepository.findActiveByCompanyAndSchool.mockResolvedValue(buildLink());

      await expect(service.linkCompany("school-1", {}, empresaActor, {})).rejects.toThrow(
        ConflictException,
      );
    });

    it("encerra o vínculo (nunca apaga o registro) ao desvincular", async () => {
      schoolRepository.findById.mockResolvedValue(buildSchool());
      companyLinkRepository.encerra.mockResolvedValue(buildLink({ desvinculadoEm: new Date() }));

      await service.unlinkCompany("school-1", "link-1", empresaActor, {});
      expect(companyLinkRepository.encerra).toHaveBeenCalledWith("link-1", "user-1");
    });
  });

  describe("importFromFile", () => {
    it("importa linhas válidas como EM_ANALISE e acumula erros de linhas inválidas, sem abortar o arquivo", async () => {
      const csv =
        "nomeOficial,dependenciaAdministrativa,cep,logradouro,numero,bairro,cidade,estado,tipos,turnosAtendidos\n" +
        "Escola Valida,MUNICIPAL,01310100,Rua A,10,Centro,São Paulo,SP,FUNDAMENTAL,MANHA\n" +
        ",MUNICIPAL,01310100,Rua B,20,Centro,São Paulo,SP,FUNDAMENTAL,MANHA\n";
      const file = { buffer: Buffer.from(csv, "utf-8") } as Express.Multer.File;

      schoolRepository.create.mockResolvedValue(buildSchool({ nomeOficial: "Escola Valida" }));

      const result = await service.importFromFile(file, "csv", empresaActor, {});

      expect(result.totalLinhas).toBe(2);
      expect(result.importadas).toBe(1);
      expect(result.erros).toHaveLength(1);
      expect(schoolRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "EM_ANALISE", origemCadastro: "IMPORT_CSV" }),
      );
    });
  });
});
