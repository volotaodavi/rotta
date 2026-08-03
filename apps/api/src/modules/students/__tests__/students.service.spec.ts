import { ForbiddenException, NotFoundException } from "@nestjs/common";


import { StudentsService } from "../students.service";

import type { StudentAuthorizedPersonRepository } from "../repositories/student-authorized-person.repository";
import type { StudentRepository } from "../repositories/student.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { Student, StudentAuthorizedPerson } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "student-1",
    responsavelId: "responsavel-1",
    nome: "Maria Souza",
    fotoUrl: null,
    dataNascimento: new Date("2015-03-20"),
    sexo: "FEMININO",
    schoolId: "school-1",
    turno: "MANHA",
    embarqueCep: "01310100",
    embarqueLogradouro: "Avenida Paulista",
    embarqueNumero: "1000",
    embarqueComplemento: null,
    embarqueBairro: "Bela Vista",
    embarqueCidade: "São Paulo",
    embarqueEstado: "SP",
    embarqueLatitude: null,
    embarqueLongitude: null,
    desembarqueCep: "01310100",
    desembarqueLogradouro: "Avenida Paulista",
    desembarqueNumero: "1000",
    desembarqueComplemento: null,
    desembarqueBairro: "Bela Vista",
    desembarqueCidade: "São Paulo",
    desembarqueEstado: "SP",
    desembarqueLatitude: null,
    desembarqueLongitude: null,
    necessidadesEspeciais: null,
    medicamentos: null,
    observacoes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildAuthorizedPerson(
  overrides: Partial<StudentAuthorizedPerson> = {},
): StudentAuthorizedPerson {
  return {
    id: "person-1",
    studentId: "student-1",
    nome: "Ana Souza",
    cpf: null,
    telefone: null,
    parentesco: "Avó",
    createdAt: new Date(),
    ...overrides,
  };
}

const responsavelActor: AuthenticatedUser = {
  sub: "responsavel-1",
  tenantId: null,
  role: Role.RESPONSAVEL,
  vinculoId: "responsavel-1",
};

const outroResponsavelActor: AuthenticatedUser = {
  sub: "responsavel-2",
  tenantId: null,
  role: Role.RESPONSAVEL,
  vinculoId: "responsavel-2",
};

const empresaActor: AuthenticatedUser = {
  sub: "user-empresa",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

const motoristaActor: AuthenticatedUser = {
  sub: "user-motorista",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-2",
};

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "admin-1",
};

describe("StudentsService", () => {
  let service: StudentsService;
  let studentRepository: jest.Mocked<StudentRepository>;
  let authorizedPersonRepository: jest.Mocked<StudentAuthorizedPersonRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let storageService: jest.Mocked<SupabaseStorageService>;

  beforeEach(() => {
    studentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdScoped: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    };
    authorizedPersonRepository = {
      create: jest.fn(),
      listByStudent: jest.fn(),
      findById: jest.fn(),
      remove: jest.fn(),
    };
    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
      listByEntity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    } as unknown as jest.Mocked<AuditLogService>;
    storageService = {
      upload: jest.fn().mockResolvedValue("https://storage.example.com/foto.png"),
    } as unknown as jest.Mocked<SupabaseStorageService>;

    service = new StudentsService(
      studentRepository,
      authorizedPersonRepository,
      auditLogService,
      storageService,
    );
  });

  describe("create", () => {
    it("sempre usa actor.sub como responsavelId, nunca um valor do DTO", async () => {
      const student = buildStudent();
      studentRepository.create.mockResolvedValue(student);

      await service.create(
        {
          nome: "Maria Souza",
          dataNascimento: "2015-03-20",
          sexo: "FEMININO",
          schoolId: "school-1",
          turno: "MANHA",
          embarqueCep: "01310100",
          embarqueLogradouro: "Avenida Paulista",
          embarqueNumero: "1000",
          embarqueBairro: "Bela Vista",
          embarqueCidade: "São Paulo",
          embarqueEstado: "SP",
          desembarqueCep: "01310100",
          desembarqueLogradouro: "Avenida Paulista",
          desembarqueNumero: "1000",
          desembarqueBairro: "Bela Vista",
          desembarqueCidade: "São Paulo",
          desembarqueEstado: "SP",
        },
        responsavelActor,
        {},
      );

      expect(studentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ responsavelId: "responsavel-1" }),
      );
    });
  });

  describe("findByIdOrThrow — RBAC por papel", () => {
    it("Responsável só enxerga o próprio aluno (404 para o aluno de outro)", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(null);

      await expect(service.findByIdOrThrow("student-1", outroResponsavelActor)).rejects.toThrow(
        NotFoundException,
      );
      expect(studentRepository.findByIdScoped).toHaveBeenCalledWith("student-1", {
        responsavelId: "responsavel-2",
      });
    });

    it("Empresa enxerga alunos com Contract ATIVO (escopo por companyId)", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());

      await service.findByIdOrThrow("student-1", empresaActor);

      expect(studentRepository.findByIdScoped).toHaveBeenCalledWith("student-1", {
        companyId: "company-1",
      });
    });

    it("Motorista enxerga alunos escopados por motoristaOuMonitorId", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());

      await service.findByIdOrThrow("student-1", motoristaActor);

      expect(studentRepository.findByIdScoped).toHaveBeenCalledWith("student-1", {
        motoristaOuMonitorId: "user-motorista",
      });
    });

    it("Admin Rotta não tem escopo (vê qualquer aluno) — usa findById puro", async () => {
      studentRepository.findById.mockResolvedValue(buildStudent());

      await service.findByIdOrThrow("student-1", adminActor);

      expect(studentRepository.findById).toHaveBeenCalledWith("student-1");
      expect(studentRepository.findByIdScoped).not.toHaveBeenCalled();
    });
  });

  describe("update/remove — exclusivo do dono", () => {
    it("rejeita update de um Responsável que não é o dono (403)", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());

      await expect(
        service.update("student-1", { nome: "Outro nome" }, outroResponsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("permite update pelo próprio dono", async () => {
      const student = buildStudent();
      studentRepository.findByIdScoped.mockResolvedValue(student);
      studentRepository.update.mockResolvedValue({ ...student, nome: "Novo nome" });

      const result = await service.update("student-1", { nome: "Novo nome" }, responsavelActor, {});

      expect(result.nome).toBe("Novo nome");
    });

    it("soft delete seta deletedAt, nunca remove a linha", async () => {
      const student = buildStudent();
      studentRepository.findByIdScoped.mockResolvedValue(student);
      studentRepository.update.mockResolvedValue({ ...student, deletedAt: new Date() });

      await service.remove("student-1", responsavelActor, {});

      expect(studentRepository.update).toHaveBeenCalledWith(
        "student-1",
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });

  describe("Pessoas autorizadas", () => {
    it("cria uma pessoa autorizada vinculada ao aluno do dono", async () => {
      const student = buildStudent();
      studentRepository.findByIdScoped.mockResolvedValue(student);
      authorizedPersonRepository.create.mockResolvedValue(buildAuthorizedPerson());

      const result = await service.createAuthorizedPerson(
        "student-1",
        { nome: "Ana Souza", parentesco: "Avó" },
        responsavelActor,
        {},
      );

      expect(result.nome).toBe("Ana Souza");
      expect(authorizedPersonRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student-1" }),
      );
    });

    it("rejeita remover pessoa autorizada de aluno que não é do ator", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());

      await expect(
        service.removeAuthorizedPerson("student-1", "person-1", outroResponsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("uploadPhoto", () => {
    it("rejeita arquivo que não é imagem", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());

      await expect(
        service.uploadPhoto(
          "student-1",
          { mimetype: "application/pdf" } as Express.Multer.File,
          responsavelActor,
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
