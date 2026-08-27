import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { StudentsService } from "../students.service";

import type { StudentAddressOverrideRepository } from "../repositories/student-address-override.repository";
import type { StudentAuthorizedPersonRepository } from "../repositories/student-authorized-person.repository";
import type { StudentRepository } from "../repositories/student.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { StudentPreRegistrationRepository } from "@/modules/student-pre-registrations/repositories/student-pre-registration.repository";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { School, Student, StudentAuthorizedPerson } from "@prisma/client";

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

describe("StudentsService", () => {
  let service: StudentsService;
  let studentRepository: jest.Mocked<StudentRepository>;
  let authorizedPersonRepository: jest.Mocked<StudentAuthorizedPersonRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let storageService: jest.Mocked<SupabaseStorageService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<Pick<MessagePersonalizationService, "novoAluno">>;
  let schoolRepository: jest.Mocked<SchoolRepository>;
  let preRegistrationRepository: jest.Mocked<StudentPreRegistrationRepository>;
  let addressOverrideRepository: jest.Mocked<StudentAddressOverrideRepository>;
  let prisma: jest.Mocked<PrismaService>;
  // Métodos genéricos do Prisma Client não tipam bem com `jest.Mocked<T>`
  // (TS não consegue inferir `MockedFunction` pra métodos genéricos dos
  // delegates) — handles próprios só pra estes dois usados nos testes.
  let routeStudentFindMany: jest.Mock;
  let tripFindFirst: jest.Mock;
  let studentDailyAbsenceUpsert: jest.Mock;
  let studentDailyAbsenceFindUnique: jest.Mock;
  let studentDailyAbsenceDelete: jest.Mock;
  let studentDailyAbsenceFindMany: jest.Mock;

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
      uploadPrivate: jest.fn().mockResolvedValue({
        path: "students/student-1/foto.png",
        url: "https://storage.example.com/foto.png?token=signed",
      }),
      getSignedUrl: jest.fn().mockResolvedValue("https://storage.example.com/foto.png?token=fresh"),
    } as unknown as jest.Mocked<SupabaseStorageService>;
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;
    messagePersonalizationService = {
      novoAluno: jest.fn().mockReturnValue({ titulo: "Novo aluno", corpo: "..." }),
    };
    schoolRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(buildSchool()),
      findByCodigoInep: jest.fn(),
      findManyByCodigosInep: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      listAllActive: jest.fn(),
      searchCandidates: jest.fn(),
      nextCodigoInternoSequence: jest.fn(),
    };
    preRegistrationRepository = {
      create: jest.fn(),
      listByCompany: jest.fn(),
      findById: jest.fn(),
      cancel: jest.fn(),
      findPendingByCompanyAndCelular: jest.fn(),
      findByIdWithCompany: jest.fn(),
      claim: jest.fn(),
      markConcluded: jest.fn(),
    };
    addressOverrideRepository = {
      upsert: jest.fn(),
      findById: jest.fn(),
      findByStudentAndDate: jest.fn(),
      listByStudent: jest.fn(),
      remove: jest.fn(),
    };
    routeStudentFindMany = jest.fn().mockResolvedValue([]);
    tripFindFirst = jest.fn().mockResolvedValue(null);
    studentDailyAbsenceUpsert = jest.fn();
    studentDailyAbsenceFindUnique = jest.fn().mockResolvedValue(null);
    studentDailyAbsenceDelete = jest.fn();
    studentDailyAbsenceFindMany = jest.fn().mockResolvedValue([]);
    prisma = {
      withBypass: jest.fn((operation: unknown) => operation),
      routeStudent: { findMany: routeStudentFindMany },
      trip: { findFirst: tripFindFirst },
      studentDailyAbsence: {
        upsert: studentDailyAbsenceUpsert,
        findUnique: studentDailyAbsenceFindUnique,
        delete: studentDailyAbsenceDelete,
        findMany: studentDailyAbsenceFindMany,
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new StudentsService(
      studentRepository,
      authorizedPersonRepository,
      auditLogService,
      storageService,
      eventEmitter,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      schoolRepository,
      preRegistrationRepository,
      addressOverrideRepository,
      prisma,
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

    it("rejeita (400, não o 500 cru de FK do Postgres) quando schoolId não existe", async () => {
      schoolRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(
          {
            nome: "Maria Souza",
            dataNascimento: "2015-03-20",
            sexo: "FEMININO",
            schoolId: "school-inexistente",
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
        ),
      ).rejects.toThrow(BadRequestException);
      expect(studentRepository.create).not.toHaveBeenCalled();
    });

    const baseDto = {
      nome: "Lucas Silva",
      dataNascimento: "2015-03-20",
      sexo: "MASCULINO" as const,
      schoolId: "school-1",
      turno: "MANHA" as const,
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
    };

    // Fluxo "código do transporte + celular" (pedido do usuário) —
    // caminho "Continuar": `preRegistrationId` reivindicado pelo próprio
    // Responsável autenticado.
    it("com preRegistrationId RECLAMADO pelo próprio actor, cria o aluno e conclui o pré-cadastro", async () => {
      const student = buildStudent();
      studentRepository.create.mockResolvedValue(student);
      preRegistrationRepository.findByIdWithCompany.mockResolvedValue({
        id: "pre-1",
        companyId: "company-1",
        criadoPorId: "user-empresa",
        nomeAluno: "Lucas Silva",
        nomeResponsavel: "Ana Silva",
        celularResponsavel: "11988887777",
        status: "RECLAMADO",
        reclamadoPorId: "responsavel-1",
        reclamadoEm: new Date(),
        studentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: "company-1", nomeFantasia: "Transportadora Exemplo" },
      });

      await service.create({ ...baseDto, preRegistrationId: "pre-1" }, responsavelActor, {});

      expect(preRegistrationRepository.markConcluded).toHaveBeenCalledWith("pre-1", student.id);
      // `preRegistrationId` nunca vaza pro `StudentRepository.create` (não é coluna de `Student`).
      expect(studentRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ preRegistrationId: expect.anything() }),
      );
    });

    it("rejeita preRegistrationId reivindicado por OUTRA pessoa (nunca cria o Student)", async () => {
      preRegistrationRepository.findByIdWithCompany.mockResolvedValue({
        id: "pre-1",
        companyId: "company-1",
        criadoPorId: "user-empresa",
        nomeAluno: "Lucas Silva",
        nomeResponsavel: "Ana Silva",
        celularResponsavel: "11988887777",
        status: "RECLAMADO",
        reclamadoPorId: "outro-responsavel",
        reclamadoEm: new Date(),
        studentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        company: { id: "company-1", nomeFantasia: "Transportadora Exemplo" },
      });

      await expect(
        service.create({ ...baseDto, preRegistrationId: "pre-1" }, responsavelActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(studentRepository.create).not.toHaveBeenCalled();
    });

    it("cadastro direto (sem preRegistrationId) nunca chama o módulo de pré-cadastro", async () => {
      studentRepository.create.mockResolvedValue(buildStudent());

      await service.create(baseDto, responsavelActor, {});

      expect(preRegistrationRepository.findByIdWithCompany).not.toHaveBeenCalled();
      expect(preRegistrationRepository.markConcluded).not.toHaveBeenCalled();
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

    it("rejeita (400) update trocando para um schoolId que não existe", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      schoolRepository.findById.mockResolvedValue(null);

      await expect(
        service.update("student-1", { schoolId: "school-inexistente" }, responsavelActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(studentRepository.update).not.toHaveBeenCalled();
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

  describe("Desvio de endereço por dia (calendário do Responsável)", () => {
    const overrideDto = {
      data: "2026-09-01",
      trecho: "AMBOS",
      cep: "20000000",
      logradouro: "Rua da Avó",
      numero: "50",
      bairro: "Centro",
      cidade: "Rio de Janeiro",
      estado: "RJ",
      latitude: -22.9,
      longitude: -43.2,
    } as never;

    it("cria o desvio quando nenhuma rota do aluno tem viagem hoje", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      routeStudentFindMany.mockResolvedValue([{ routeId: "route-1" }] as never);
      tripFindFirst.mockResolvedValue(null);
      addressOverrideRepository.upsert.mockResolvedValue({
        id: "override-1",
        studentId: "student-1",
        data: new Date("2026-09-01T00:00:00.000Z"),
        trecho: "AMBOS",
        cep: "20000000",
        logradouro: "Rua da Avó",
        numero: "50",
        complemento: null,
        bairro: "Centro",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        latitude: -22.9,
        longitude: -43.2,
        observacao: null,
        criadoPorUserId: "responsavel-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await service.upsertAddressOverride(
        "student-1",
        overrideDto,
        responsavelActor,
        {},
      );

      expect(result.data).toBe("2026-09-01");
      expect(addressOverrideRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student-1", criadoPorUserId: "responsavel-1" }),
      );
    });

    it("rejeita criar/editar o desvio quando a viagem do dia já começou", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      routeStudentFindMany.mockResolvedValue([{ routeId: "route-1" }] as never);
      tripFindFirst.mockResolvedValue({ id: "trip-1" });

      await expect(
        service.upsertAddressOverride("student-1", overrideDto, responsavelActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(addressOverrideRepository.upsert).not.toHaveBeenCalled();
    });

    it("rejeita um Responsável que não é dono do aluno", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());

      await expect(
        service.upsertAddressOverride("student-1", overrideDto, outroResponsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("nunca bloqueia um aluno ainda sem nenhuma rota ativa", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      routeStudentFindMany.mockResolvedValue([]);
      addressOverrideRepository.upsert.mockResolvedValue({
        id: "override-1",
        studentId: "student-1",
        data: new Date("2026-09-01T00:00:00.000Z"),
        trecho: "AMBOS",
        cep: "20000000",
        logradouro: "Rua da Avó",
        numero: "50",
        complemento: null,
        bairro: "Centro",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        latitude: -22.9,
        longitude: -43.2,
        observacao: null,
        criadoPorUserId: "responsavel-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await service.upsertAddressOverride("student-1", overrideDto, responsavelActor, {});

      expect(tripFindFirst).not.toHaveBeenCalled();
      expect(addressOverrideRepository.upsert).toHaveBeenCalled();
    });

    it("rejeita remover um desvio de outro aluno (id não bate)", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      addressOverrideRepository.findById.mockResolvedValue({
        id: "override-1",
        studentId: "student-outro",
      } as never);

      await expect(
        service.removeAddressOverride("student-1", "override-1", responsavelActor, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("marcarAusenciaHoje / removerAusenciaHoje / getAusenciaHoje (Epic C)", () => {
    it("cria a ausência de hoje quando nenhuma rota do aluno tem viagem hoje", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      routeStudentFindMany.mockResolvedValue([{ routeId: "route-1" }] as never);
      tripFindFirst.mockResolvedValue(null);

      const result = await service.marcarAusenciaHoje(
        "student-1",
        { motivo: "Consulta médica" },
        responsavelActor,
        {},
      );

      expect(studentDailyAbsenceUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId_data: { studentId: "student-1", data: expect.any(Date) } },
          create: expect.objectContaining({
            studentId: "student-1",
            motivo: "Consulta médica",
            criadoPorUserId: "responsavel-1",
          }),
        }),
      );
      expect(result.studentId).toBe("student-1");
      expect(result.motivo).toBe("Consulta médica");
    });

    it("rejeita marcar ausência quando a viagem do dia já começou", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      routeStudentFindMany.mockResolvedValue([{ routeId: "route-1" }] as never);
      tripFindFirst.mockResolvedValue({ id: "trip-1" });

      await expect(
        service.marcarAusenciaHoje("student-1", {}, responsavelActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(studentDailyAbsenceUpsert).not.toHaveBeenCalled();
    });

    it("rejeita um Responsável que não é dono do aluno", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());

      await expect(
        service.marcarAusenciaHoje("student-1", {}, outroResponsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("removerAusenciaHoje é um no-op quando não há nenhuma ausência marcada hoje", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      studentDailyAbsenceFindUnique.mockResolvedValue(null);

      await service.removerAusenciaHoje("student-1", responsavelActor, {});

      expect(studentDailyAbsenceDelete).not.toHaveBeenCalled();
    });

    it("removerAusenciaHoje remove o registro do dia quando existe", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      studentDailyAbsenceFindUnique.mockResolvedValue({ id: "absence-1" });

      await service.removerAusenciaHoje("student-1", responsavelActor, {});

      expect(studentDailyAbsenceDelete).toHaveBeenCalledWith({ where: { id: "absence-1" } });
    });

    it("getAusenciaHoje devolve null quando o aluno não está marcado ausente hoje", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      studentDailyAbsenceFindUnique.mockResolvedValue(null);

      const result = await service.getAusenciaHoje("student-1", responsavelActor);

      expect(result).toBeNull();
    });

    it("getAusenciaHoje devolve o motivo quando o aluno está marcado ausente hoje", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      studentDailyAbsenceFindUnique.mockResolvedValue({ motivo: "Viagem em família" });

      const result = await service.getAusenciaHoje("student-1", responsavelActor);

      expect(result).toEqual(
        expect.objectContaining({ studentId: "student-1", motivo: "Viagem em família" }),
      );
    });

    it("listAbsentStudentIdsToday devolve vazio sem consultar o banco quando a lista de alunos é vazia", async () => {
      const result = await service.listAbsentStudentIdsToday([]);

      expect(result.size).toBe(0);
      expect(studentDailyAbsenceFindMany).not.toHaveBeenCalled();
    });

    it("listAbsentStudentIdsToday devolve o conjunto de alunos ausentes hoje", async () => {
      studentDailyAbsenceFindMany.mockResolvedValue([
        { studentId: "student-1" },
        { studentId: "student-2" },
      ] as never);

      const result = await service.listAbsentStudentIdsToday([
        "student-1",
        "student-2",
        "student-3",
      ]);

      expect(result.has("student-1")).toBe(true);
      expect(result.has("student-2")).toBe(true);
      expect(result.has("student-3")).toBe(false);
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

    it("persiste fotoPath e devolve a URL de curta validade recém-assinada, nunca a de 10 anos (Dossiê 45, achado C3)", async () => {
      studentRepository.findByIdScoped.mockResolvedValue(buildStudent());
      studentRepository.update.mockResolvedValue(
        buildStudent({
          fotoUrl: "https://storage.example.com/foto.png?token=signed",
          fotoPath: "students/student-1/foto.png",
        }),
      );

      const result = await service.uploadPhoto(
        "student-1",
        { mimetype: "image/png", originalname: "foto.png" } as Express.Multer.File,
        responsavelActor,
        {},
      );

      expect(studentRepository.update).toHaveBeenCalledWith("student-1", {
        fotoUrl: "https://storage.example.com/foto.png?token=signed",
        fotoPath: "students/student-1/foto.png",
      });
      // Não é a `getSignedUrl` mockada — a própria resposta do upload já é
      // de curta validade, então `uploadPhoto` não precisa reassinar de novo.
      expect(result.fotoUrl).toBe("https://storage.example.com/foto.png?token=signed");
      expect(storageService.getSignedUrl).not.toHaveBeenCalled();
    });
  });
});
