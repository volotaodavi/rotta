import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import {
  NotificationEventType,
  VehicleAdminReviewStatus,
  VehicleAssignmentRole,
  VehicleCategory,
  VehicleCategoryOrigin,
  VehicleCategoryReviewStatus,
  VehicleOccurrenceSeverity,
  VehicleStatus,
  VehicleType,
} from "@prisma/client";

import { VehicleCategoryClassifierService } from "../vehicle-category-classifier.service";
import { VehiclesService } from "../vehicles.service";

import type { CreateVehicleDto } from "../dto/create-vehicle.dto";
import type { VehicleAssignmentRepository } from "../repositories/vehicle-assignment.repository";
import type { VehicleChecklistRepository } from "../repositories/vehicle-checklist.repository";
import type { VehicleDocumentRepository } from "../repositories/vehicle-document.repository";
import type { VehicleMaintenanceRepository } from "../repositories/vehicle-maintenance.repository";
import type { VehicleOccurrenceRepository } from "../repositories/vehicle-occurrence.repository";
import type { VehicleReminderRepository } from "../repositories/vehicle-reminder.repository";
import type { VehicleRepository } from "../repositories/vehicle.repository";
import type { VehiclePlateLookupService } from "../vehicle-plate-lookup.service";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { RottaAiService } from "@/modules/rotta-ai/rotta-ai.service";
import type { UsersService } from "@/modules/users/users.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Membership, Vehicle, VehicleDocument } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "vehicle-1",
    companyId: "company-1",
    placa: "ABC1D23",
    modelo: "Sprinter 415",
    marca: "Mercedes-Benz",
    ano: 2022,
    cor: "Branco",
    renavam: null,
    chassi: null,
    capacidadePassageiros: 16,
    tipo: VehicleType.VAN,
    categoria: VehicleCategory.ESCOLAR,
    categoriaOrigem: VehicleCategoryOrigin.MANUAL,
    categoriaRevisaoStatus: VehicleCategoryReviewStatus.NAO_REQUER,
    categoriaConfiancaIa: null,
    categoriaMotivoIa: null,
    categoriaRevisadaPorId: null,
    categoriaRevisadaEm: null,
    observacoes: null,
    fotoUrl: null,
    status: VehicleStatus.DISPONIVEL,
    revisaoAdminStatus: VehicleAdminReviewStatus.PRE_APROVADO,
    revisaoAdminObservacaoResponsaveis: null,
    revisaoAdminObservacaoTransportadora: null,
    revisaoAdminDecididoPorId: null,
    revisaoAdminDecididoEm: null,
    quilometragemAtual: 10_000,
    ultimaLatitude: null,
    ultimaLongitude: null,
    ultimaPosicaoEm: null,
    viagemAtualId: null,
    ultimoMotoristaId: null,
    ultimoMonitorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildCreateDto(overrides: Partial<CreateVehicleDto> = {}): CreateVehicleDto {
  return {
    placa: "ABC1D23",
    modelo: "Sprinter 415",
    marca: "Mercedes-Benz",
    ano: 2022,
    cor: "Branco",
    capacidadePassageiros: 16,
    tipo: VehicleType.VAN,
    ...overrides,
  };
}

function buildDocument(overrides: Partial<VehicleDocument> = {}): VehicleDocument {
  return {
    id: "document-1",
    vehicleId: "vehicle-1",
    companyId: "company-1",
    maintenanceId: null,
    tipo: "CRLV",
    nomeOriginal: "crlv.pdf",
    mimeType: "application/pdf",
    fileUrl: "https://storage.test/vehicles/vehicle-1/documents/1.pdf",
    vencimentoEm: null,
    rottaAiStatus: "PENDENTE",
    rottaAiQualidadeOk: null,
    rottaAiLegivel: null,
    rottaAiSuspeitaAdulteracao: null,
    rottaAiObservacoes: null,
    rottaAiAnalisadoEm: null,
    uploadedByUserId: "user-1",
    createdAt: new Date(),
    deletedAt: null,
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

describe("VehiclesService", () => {
  let service: VehiclesService;
  let vehicleRepository: jest.Mocked<VehicleRepository>;
  let documentRepository: jest.Mocked<VehicleDocumentRepository>;
  let maintenanceRepository: jest.Mocked<VehicleMaintenanceRepository>;
  let reminderRepository: jest.Mocked<VehicleReminderRepository>;
  let assignmentRepository: jest.Mocked<VehicleAssignmentRepository>;
  let checklistRepository: jest.Mocked<VehicleChecklistRepository>;
  let occurrenceRepository: jest.Mocked<VehicleOccurrenceRepository>;
  let usersService: jest.Mocked<UsersService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let storageService: jest.Mocked<SupabaseStorageService>;
  let rottaAiService: jest.Mocked<RottaAiService>;
  let plateLookupService: jest.Mocked<VehiclePlateLookupService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<MessagePersonalizationService>;

  beforeEach(() => {
    vehicleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPlaca: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      listAllActive: jest.fn(),
      listPendingCategoryReview: jest.fn(),
      listActiveResponsavelIds: jest.fn().mockResolvedValue([]),
      listVehiclesForResponsavel: jest.fn(),
      existsAdminReviewAcknowledgement: jest.fn(),
      createAdminReviewAcknowledgement: jest.fn(),
    };
    documentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateAiResult: jest.fn(),
      listByVehicle: jest.fn(),
      listExpiringSoon: jest.fn(),
      softDelete: jest.fn(),
    };
    maintenanceRepository = { create: jest.fn(), findById: jest.fn(), list: jest.fn() };
    reminderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findPendingByVehicleAndType: jest.fn(),
      update: jest.fn(),
      listByVehicle: jest.fn(),
      listPendingByCompany: jest.fn(),
    };
    assignmentRepository = {
      create: jest.fn(),
      findCurrent: jest.fn(),
      encerraCurrent: jest.fn(),
      listHistoryByVehicle: jest.fn(),
      findCurrentVehicleIdForUser: jest.fn(),
    };
    checklistRepository = { create: jest.fn(), list: jest.fn() };
    occurrenceRepository = { create: jest.fn(), list: jest.fn() };
    usersService = {
      findActiveMembership: jest.fn(),
      listMembershipsByCompany: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    auditLogService = {
      record: jest.fn(),
      listByCompany: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;
    storageService = {
      upload: jest.fn(),
      uploadPrivate: jest.fn(),
      getSignedUrl: jest.fn(),
    } as unknown as jest.Mocked<SupabaseStorageService>;
    rottaAiService = {
      validateDocument: jest.fn(),
      analyzeVehicleDocument: jest.fn(),
    };
    plateLookupService = {
      isConfigured: jest.fn(),
      lookup: jest.fn(),
    } as unknown as jest.Mocked<VehiclePlateLookupService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    messagePersonalizationService = {
      veiculoRevisaoAprovada: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      veiculoRevisaoReprovada: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      ocorrencia: jest.fn().mockReturnValue({ titulo: "Ocorrência registrada", corpo: "c" }),
      emergencia: jest.fn().mockReturnValue({ titulo: "Emergência", corpo: "c" }),
    } as unknown as jest.Mocked<MessagePersonalizationService>;

    service = new VehiclesService(
      vehicleRepository,
      documentRepository,
      maintenanceRepository,
      reminderRepository,
      assignmentRepository,
      checklistRepository,
      occurrenceRepository,
      usersService,
      auditLogService,
      storageService,
      rottaAiService,
      plateLookupService,
      new VehicleCategoryClassifierService(),
      eventEmitter,
      messagePersonalizationService,
    );

    vehicleRepository.findByPlaca.mockResolvedValue(null);
  });

  // Regressão do achado CRÍTICO real em produção: `companyId` ficava
  // `undefined` para todo ator não-Admin Rotta em `list`/`exportList`,
  // confiando só na RLS do banco — uma Empresa sem veículo próprio
  // recebia (e exportava em CSV/Excel/PDF) a frota de TODAS as
  // empresas. Nunca mais deixar isso sem filtro explícito no `where`.
  describe("list — vazamento cross-tenant (achado crítico real em produção)", () => {
    it("SEMPRE escopa companyId ao próprio tenant do ator para Empresa (nunca undefined)", async () => {
      vehicleRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.list(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
        empresaActor,
      );

      expect(vehicleRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1" }),
      );
    });

    it("nunca aceita companyId vindo do cliente para ator não-Admin Rotta (ignora query.companyId)", async () => {
      vehicleRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.list(
        {
          page: 1,
          pageSize: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
          companyId: "empresa-de-outro-tenant",
        },
        empresaActor,
      );

      expect(vehicleRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1" }),
      );
    });

    it("Admin Rotta usa o companyId informado na query (ou undefined = todos os tenants)", async () => {
      vehicleRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.list(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc", companyId: "company-2" },
        adminActor,
      );
      expect(vehicleRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-2" }),
      );

      await service.list(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
        adminActor,
      );
      expect(vehicleRepository.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ companyId: undefined }),
      );
    });
  });

  describe("exportList — vazamento cross-tenant (achado crítico real em produção)", () => {
    it("SEMPRE escopa companyId ao próprio tenant do ator para Empresa (nunca undefined)", async () => {
      vehicleRepository.list.mockResolvedValue({ items: [], total: 0 });

      await service.exportList(
        { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
        empresaActor,
        "csv",
      );

      expect(vehicleRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1" }),
      );
    });
  });

  describe("create", () => {
    it("rejeita capacidade fora da faixa esperada para o tipo (VAN: 8-16)", async () => {
      const dto = buildCreateDto({ capacidadePassageiros: 3 });
      await expect(service.create(dto, empresaActor, {})).rejects.toThrow(BadRequestException);
    });

    it("rejeita placa duplicada", async () => {
      vehicleRepository.findByPlaca.mockResolvedValue(buildVehicle());
      await expect(service.create(buildCreateDto(), empresaActor, {})).rejects.toThrow(
        ConflictException,
      );
    });

    it("cria o veículo no tenant do ator, normalizando a placa", async () => {
      const created = buildVehicle();
      vehicleRepository.create.mockResolvedValue(created);

      await service.create(buildCreateDto({ placa: "abc-1d23" }), empresaActor, {});

      expect(vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1", placa: "ABC1D23" }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "CREATED", entidadeTipo: "Vehicle" }),
      );
    });

    it("Frente AL: sem `categoria` no DTO, deixa a IA decidir (origem IA)", async () => {
      vehicleRepository.create.mockResolvedValue(buildVehicle());

      await service.create(
        buildCreateDto({ tipo: VehicleType.SEDAN, capacidadePassageiros: 5 }),
        empresaActor,
        {},
      );

      expect(vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria: VehicleCategory.EXECUTIVO,
          categoriaOrigem: VehicleCategoryOrigin.IA,
          categoriaRevisaoStatus: VehicleCategoryReviewStatus.NAO_REQUER,
          categoriaConfiancaIa: expect.any(Number),
          categoriaMotivoIa: expect.any(String),
        }),
      );
    });

    it("Frente AL: confiança baixa da IA marca revisão pendente, sem bloquear a criação", async () => {
      vehicleRepository.create.mockResolvedValue(buildVehicle());

      await service.create(
        buildCreateDto({ tipo: VehicleType.VAN, capacidadePassageiros: 16 }),
        empresaActor,
        {},
      );

      expect(vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria: VehicleCategory.ESCOLAR,
          categoriaOrigem: VehicleCategoryOrigin.IA,
          categoriaRevisaoStatus: VehicleCategoryReviewStatus.PENDENTE,
        }),
      );
    });

    it("Frente AL: categoria escolhida manualmente vira origem MANUAL, sem revisão", async () => {
      vehicleRepository.create.mockResolvedValue(buildVehicle());

      await service.create(
        buildCreateDto({ tipo: VehicleType.VAN, categoria: VehicleCategory.FRETAMENTO }),
        empresaActor,
        {},
      );

      expect(vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria: VehicleCategory.FRETAMENTO,
          categoriaOrigem: VehicleCategoryOrigin.MANUAL,
          categoriaRevisaoStatus: VehicleCategoryReviewStatus.NAO_REQUER,
          categoriaConfiancaIa: undefined,
          categoriaMotivoIa: undefined,
        }),
      );
    });
  });

  describe("lookupByPlate", () => {
    it("rejeita placa em formato inválido antes de chamar o provedor", async () => {
      await expect(service.lookupByPlate("123-INVALIDA")).rejects.toThrow(BadRequestException);
      expect(plateLookupService.lookup).not.toHaveBeenCalled();
    });

    it("normaliza a placa e delega ao provedor configurado", async () => {
      plateLookupService.lookup.mockResolvedValue({
        marca: "Mercedes-Benz",
        modelo: "Sprinter 415",
        ano: 2022,
        cor: "Branco",
      });

      const result = await service.lookupByPlate("abc-1d23");

      expect(plateLookupService.lookup).toHaveBeenCalledWith("ABC1D23");
      expect(result.marca).toBe("Mercedes-Benz");
    });
  });

  describe("findByIdOrThrow", () => {
    it("lança 404 quando o veículo não existe", async () => {
      vehicleRepository.findById.mockResolvedValue(null);
      await expect(service.findByIdOrThrow("missing", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lança 404 (não 403) quando o veículo pertence a outro tenant", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle({ companyId: "other-company" }));
      await expect(service.findByIdOrThrow("vehicle-1", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("Admin Rotta acessa veículo de qualquer tenant", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle({ companyId: "other-company" }));
      const result = await service.findByIdOrThrow("vehicle-1", adminActor);
      expect(result.id).toBe("vehicle-1");
    });

    it("Motorista só acessa o veículo atualmente vinculado a ele", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      assignmentRepository.findCurrentVehicleIdForUser.mockResolvedValue("outro-veiculo");

      await expect(service.findByIdOrThrow("vehicle-1", motoristaActor)).rejects.toThrow(
        NotFoundException,
      );

      assignmentRepository.findCurrentVehicleIdForUser.mockResolvedValue("vehicle-1");
      const result = await service.findByIdOrThrow("vehicle-1", motoristaActor);
      expect(result.id).toBe("vehicle-1");
    });
  });

  describe("update", () => {
    it("revalida a capacidade ao trocar apenas o tipo", async () => {
      vehicleRepository.findById.mockResolvedValue(
        buildVehicle({ tipo: VehicleType.VAN, capacidadePassageiros: 16 }),
      );
      await expect(
        service.update("vehicle-1", { tipo: VehicleType.SEDAN }, empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("não faz nada quando nenhum campo mudou", async () => {
      const existing = buildVehicle();
      vehicleRepository.findById.mockResolvedValue(existing);
      await service.update("vehicle-1", {}, empresaActor, {});
      expect(vehicleRepository.update).not.toHaveBeenCalled();
    });

    it("Frente AL: escolher categoria manualmente encerra a revisão pendente da IA", async () => {
      const existing = buildVehicle({
        categoriaOrigem: VehicleCategoryOrigin.IA,
        categoriaRevisaoStatus: VehicleCategoryReviewStatus.PENDENTE,
        categoriaConfiancaIa: 65,
        categoriaMotivoIa: "sugestão antiga da IA",
      });
      vehicleRepository.findById.mockResolvedValue(existing);
      vehicleRepository.update.mockResolvedValue(existing);

      await service.update("vehicle-1", { categoria: VehicleCategory.EXECUTIVO }, empresaActor, {});

      expect(vehicleRepository.update).toHaveBeenCalledWith(
        "vehicle-1",
        expect.objectContaining({
          categoria: VehicleCategory.EXECUTIVO,
          categoriaOrigem: VehicleCategoryOrigin.MANUAL,
          categoriaRevisaoStatus: VehicleCategoryReviewStatus.NAO_REQUER,
          categoriaConfiancaIa: null,
          categoriaMotivoIa: null,
        }),
      );
    });
  });

  describe("revisão de categoria (Frente AL, Admin Rotta)", () => {
    it("listCategoryReview delega ao repositório com a paginação informada", async () => {
      vehicleRepository.listPendingCategoryReview.mockResolvedValue({
        items: [buildVehicle({ categoriaRevisaoStatus: VehicleCategoryReviewStatus.PENDENTE })],
        total: 1,
      });

      const result = await service.listCategoryReview({ page: 2, pageSize: 10 });

      expect(vehicleRepository.listPendingCategoryReview).toHaveBeenCalledWith({
        companyId: undefined,
        page: 2,
        pageSize: 10,
      });
      expect(result.total).toBe(1);
    });

    it("rejeita revisar um veículo que não está PENDENTE", async () => {
      vehicleRepository.findById.mockResolvedValue(
        buildVehicle({ categoriaRevisaoStatus: VehicleCategoryReviewStatus.NAO_REQUER }),
      );

      await expect(service.resolveCategoryReview("vehicle-1", {}, adminActor, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(vehicleRepository.update).not.toHaveBeenCalled();
    });

    it("sem `categoria` no corpo, confirma a sugestão da IA", async () => {
      const existing = buildVehicle({
        categoria: VehicleCategory.ESCOLAR,
        categoriaRevisaoStatus: VehicleCategoryReviewStatus.PENDENTE,
      });
      vehicleRepository.findById.mockResolvedValue(existing);
      vehicleRepository.update.mockResolvedValue(existing);

      await service.resolveCategoryReview("vehicle-1", {}, adminActor, {});

      expect(vehicleRepository.update).toHaveBeenCalledWith(
        "vehicle-1",
        expect.objectContaining({
          categoriaRevisaoStatus: VehicleCategoryReviewStatus.CONFIRMADA,
          categoriaRevisadaPorId: "admin-1",
        }),
      );
      expect(vehicleRepository.update).toHaveBeenCalledWith(
        "vehicle-1",
        expect.not.objectContaining({ categoria: expect.anything() }),
      );
    });

    it("com uma `categoria` diferente, corrige a sugestão da IA", async () => {
      const existing = buildVehicle({
        categoria: VehicleCategory.ESCOLAR,
        categoriaRevisaoStatus: VehicleCategoryReviewStatus.PENDENTE,
      });
      vehicleRepository.findById.mockResolvedValue(existing);
      vehicleRepository.update.mockResolvedValue({
        ...existing,
        categoria: VehicleCategory.EXECUTIVO,
      });

      await service.resolveCategoryReview(
        "vehicle-1",
        { categoria: VehicleCategory.EXECUTIVO },
        adminActor,
        {},
      );

      expect(vehicleRepository.update).toHaveBeenCalledWith(
        "vehicle-1",
        expect.objectContaining({
          categoria: VehicleCategory.EXECUTIVO,
          categoriaRevisaoStatus: VehicleCategoryReviewStatus.CORRIGIDA,
          categoriaRevisadaPorId: "admin-1",
        }),
      );
    });
  });

  describe("updateStatus", () => {
    it("atualiza o status e registra auditoria", async () => {
      const existing = buildVehicle({ status: VehicleStatus.DISPONIVEL });
      vehicleRepository.findById.mockResolvedValue(existing);
      vehicleRepository.update.mockResolvedValue({ ...existing, status: VehicleStatus.MANUTENCAO });

      const result = await service.updateStatus(
        "vehicle-1",
        { status: VehicleStatus.MANUTENCAO },
        empresaActor,
        {},
      );

      expect(result.status).toBe(VehicleStatus.MANUTENCAO);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "STATUS_CHANGED" }),
      );
    });
  });

  describe("updateLocation", () => {
    it("marca o ator como último motorista quando ele é Motorista", async () => {
      const existing = buildVehicle();
      vehicleRepository.findById.mockResolvedValue(existing);
      assignmentRepository.findCurrentVehicleIdForUser.mockResolvedValue("vehicle-1");
      vehicleRepository.update.mockResolvedValue(existing);

      await service.updateLocation(
        "vehicle-1",
        { latitude: -23.5, longitude: -46.6 },
        motoristaActor,
      );

      expect(vehicleRepository.update).toHaveBeenCalledWith(
        "vehicle-1",
        expect.objectContaining({ ultimoMotoristaId: "motorista-1" }),
      );
    });
  });

  describe("assign", () => {
    it("rejeita quando o usuário não tem vínculo ativo do papel esperado", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      usersService.findActiveMembership.mockResolvedValue(null);

      await expect(
        service.assign(
          "vehicle-1",
          { papel: VehicleAssignmentRole.MOTORISTA, userId: "driver-1" },
          empresaActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("encerra o vínculo vigente antes de criar o novo, preservando histórico", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      usersService.findActiveMembership.mockResolvedValue({ role: "motorista" } as Membership);
      assignmentRepository.create.mockResolvedValue({
        id: "assignment-1",
        vehicleId: "vehicle-1",
        companyId: "company-1",
        papel: VehicleAssignmentRole.MOTORISTA,
        userId: "driver-1",
        iniciadoEm: new Date(),
        encerradoEm: null,
        criadoPorId: "user-1",
      });

      await service.assign(
        "vehicle-1",
        { papel: VehicleAssignmentRole.MOTORISTA, userId: "driver-1" },
        empresaActor,
        {},
      );

      expect(assignmentRepository.encerraCurrent).toHaveBeenCalledWith(
        "vehicle-1",
        VehicleAssignmentRole.MOTORISTA,
      );
      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "driver-1" }),
      );
      expect(vehicleRepository.update).toHaveBeenCalledWith("vehicle-1", {
        ultimoMotoristaId: "driver-1",
      });
    });
  });

  describe("findMyVehicle", () => {
    it("retorna null quando o motorista não tem veículo vinculado", async () => {
      assignmentRepository.findCurrentVehicleIdForUser.mockResolvedValue(null);
      const result = await service.findMyVehicle(motoristaActor);
      expect(result).toBeNull();
    });

    it("retorna o veículo atualmente vinculado", async () => {
      assignmentRepository.findCurrentVehicleIdForUser.mockResolvedValue("vehicle-1");
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      const result = await service.findMyVehicle(motoristaActor);
      expect(result?.id).toBe("vehicle-1");
    });
  });

  describe("uploadDocument", () => {
    it("rejeita arquivo que não é PDF nem imagem", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      const file = { mimetype: "text/plain", originalname: "a.txt" } as Express.Multer.File;
      await expect(
        service.uploadDocument("vehicle-1", { tipo: "CRLV" } as never, file, empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("cria o documento, marca a análise da Rotta AI como indisponível quando o download do arquivo falha, e gera lembrete de vencimento", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      storageService.uploadPrivate.mockResolvedValue({
        path: "vehicles/vehicle-1/documents/doc.pdf",
        url: "https://storage.test/doc.pdf?token=signed",
      });
      const created = buildDocument({ vencimentoEm: new Date("2027-01-01") });
      documentRepository.create.mockResolvedValue(created);
      rottaAiService.analyzeVehicleDocument.mockRejectedValue(new Error("download falhou"));
      documentRepository.updateAiResult.mockResolvedValue({
        ...created,
        rottaAiStatus: "INDISPONIVEL",
      });
      reminderRepository.findPendingByVehicleAndType.mockResolvedValue(null);

      const file = { mimetype: "application/pdf", originalname: "crlv.pdf" } as Express.Multer.File;
      const result = await service.uploadDocument(
        "vehicle-1",
        { tipo: "CRLV", vencimentoEm: "2027-01-01" } as never,
        file,
        empresaActor,
        {},
      );

      expect(documentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileUrl: "https://storage.test/doc.pdf?token=signed",
          filePath: "vehicles/vehicle-1/documents/doc.pdf",
        }),
      );
      expect(reminderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: "LICENCIAMENTO" }),
      );
      expect(result.rottaAiStatus).toBe("INDISPONIVEL");
    });

    it("qualidadeAdequada=true (Frente E) grava PENDENTE — nunca APROVADO, o conteúdo do documento não foi verificado", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      storageService.uploadPrivate.mockResolvedValue({
        path: "vehicles/vehicle-1/documents/doc.pdf",
        url: "https://storage.test/doc.pdf?token=signed",
      });
      documentRepository.create.mockResolvedValue(buildDocument());
      rottaAiService.analyzeVehicleDocument.mockResolvedValue({
        tipo: "CRLV",
        formatoValido: true,
        formatoDetectado: "jpeg",
        larguraPx: 1200,
        alturaPx: 900,
        qualidadeAdequada: true,
        tamanhoBytes: 50_000,
        avisos: ["Esta análise cobre apenas formato e resolução da imagem."],
        analiseCompleta: false,
      });
      documentRepository.updateAiResult.mockResolvedValue(
        buildDocument({ rottaAiStatus: "PENDENTE" }),
      );
      reminderRepository.findPendingByVehicleAndType.mockResolvedValue(null);

      const file = { mimetype: "image/jpeg", originalname: "crlv.jpg" } as Express.Multer.File;
      await service.uploadDocument("vehicle-1", { tipo: "CRLV" } as never, file, empresaActor, {});

      expect(documentRepository.updateAiResult).toHaveBeenCalledWith(
        "document-1",
        expect.objectContaining({ rottaAiStatus: "PENDENTE" }),
      );
    });

    it("qualidadeAdequada=false (Frente E — resolução baixa/formato inválido) grava REPROVADO", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      storageService.uploadPrivate.mockResolvedValue({
        path: "vehicles/vehicle-1/documents/doc.pdf",
        url: "https://storage.test/doc.pdf?token=signed",
      });
      documentRepository.create.mockResolvedValue(buildDocument());
      rottaAiService.analyzeVehicleDocument.mockResolvedValue({
        tipo: "CRLV",
        formatoValido: true,
        formatoDetectado: "jpeg",
        larguraPx: 100,
        alturaPx: 80,
        qualidadeAdequada: false,
        tamanhoBytes: 2_000,
        avisos: ["Resolução baixa (100x80px)."],
        analiseCompleta: false,
      });
      documentRepository.updateAiResult.mockResolvedValue(
        buildDocument({ rottaAiStatus: "REPROVADO" }),
      );
      reminderRepository.findPendingByVehicleAndType.mockResolvedValue(null);

      const file = { mimetype: "image/jpeg", originalname: "crlv.jpg" } as Express.Multer.File;
      await service.uploadDocument("vehicle-1", { tipo: "CRLV" } as never, file, empresaActor, {});

      expect(documentRepository.updateAiResult).toHaveBeenCalledWith(
        "document-1",
        expect.objectContaining({ rottaAiStatus: "REPROVADO" }),
      );
    });
  });

  describe("createMaintenance", () => {
    it("atualiza a quilometragem do veículo quando a manutenção informa um valor maior", async () => {
      const existing = buildVehicle({ quilometragemAtual: 10_000 });
      vehicleRepository.findById.mockResolvedValue(existing);
      maintenanceRepository.create.mockResolvedValue({
        id: "maintenance-1",
        vehicleId: "vehicle-1",
        companyId: "company-1",
        tipo: "TROCA_OLEO",
        data: new Date(),
        quilometragem: 12_000,
        valorCentavos: null,
        fornecedor: null,
        observacoes: null,
        registradoPorId: "user-1",
        createdAt: new Date(),
      });

      await service.createMaintenance(
        "vehicle-1",
        { tipo: "TROCA_OLEO", data: "2026-08-01", quilometragem: 12_000 } as never,
        empresaActor,
        {},
      );

      expect(vehicleRepository.update).toHaveBeenCalledWith("vehicle-1", {
        quilometragemAtual: 12_000,
      });
    });

    it("não regride a quilometragem quando o valor informado é menor", async () => {
      const existing = buildVehicle({ quilometragemAtual: 10_000 });
      vehicleRepository.findById.mockResolvedValue(existing);
      maintenanceRepository.create.mockResolvedValue({
        id: "maintenance-1",
        vehicleId: "vehicle-1",
        companyId: "company-1",
        tipo: "TROCA_OLEO",
        data: new Date(),
        quilometragem: 5_000,
        valorCentavos: null,
        fornecedor: null,
        observacoes: null,
        registradoPorId: "user-1",
        createdAt: new Date(),
      });

      await service.createMaintenance(
        "vehicle-1",
        { tipo: "TROCA_OLEO", data: "2026-08-01", quilometragem: 5_000 } as never,
        empresaActor,
        {},
      );

      expect(vehicleRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("createChecklist", () => {
    it("sempre usa o ator autenticado como motorista, nunca o body", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      assignmentRepository.findCurrentVehicleIdForUser.mockResolvedValue("vehicle-1");
      checklistRepository.create.mockResolvedValue({
        id: "checklist-1",
        vehicleId: "vehicle-1",
        companyId: "company-1",
        motoristaId: "motorista-1",
        viagemId: null,
        pneusOk: true,
        lucesOk: true,
        combustivelOk: true,
        limpezaOk: true,
        equipamentosObrigatoriosOk: true,
        observacoes: null,
        createdAt: new Date(),
      });

      await service.createChecklist(
        "vehicle-1",
        {
          pneusOk: true,
          lucesOk: true,
          combustivelOk: true,
          limpezaOk: true,
          equipamentosObrigatoriosOk: true,
        },
        motoristaActor,
      );

      expect(checklistRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ motoristaId: "motorista-1" }),
      );
    });
  });

  describe("getDashboard", () => {
    it("exige companyId explícito quando o ator é Admin Rotta", async () => {
      await expect(service.getDashboard(adminActor, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("agrega contadores a partir dos veículos ativos do tenant", async () => {
      vehicleRepository.listAllActive.mockResolvedValue([
        buildVehicle({
          status: VehicleStatus.DISPONIVEL,
          capacidadePassageiros: 16,
          quilometragemAtual: 1000,
        }),
        buildVehicle({
          id: "vehicle-2",
          status: VehicleStatus.EM_VIAGEM,
          capacidadePassageiros: 45,
          quilometragemAtual: 2000,
        }),
        buildVehicle({
          id: "vehicle-3",
          status: VehicleStatus.MANUTENCAO,
          capacidadePassageiros: 20,
          quilometragemAtual: 500,
        }),
        buildVehicle({
          id: "vehicle-4",
          status: VehicleStatus.INATIVO,
          capacidadePassageiros: 5,
          quilometragemAtual: 0,
        }),
      ]);
      documentRepository.listExpiringSoon.mockResolvedValue([]);
      reminderRepository.listPendingByCompany.mockResolvedValue([]);

      const dashboard = await service.getDashboard(empresaActor);

      expect(dashboard.totalVeiculos).toBe(4);
      expect(dashboard.veiculosAtivos).toBe(3);
      expect(dashboard.veiculosEmViagem).toBe(1);
      expect(dashboard.veiculosEmManutencao).toBe(1);
      expect(dashboard.capacidadeTotalPassageiros).toBe(86);
      expect(dashboard.quilometragemTotal).toBe(3500);
    });
  });

  describe("assertVeiculoOperavel (Epic A)", () => {
    it("bloqueia veículo REPROVADO pelo Admin Rotta", () => {
      expect(() =>
        service.assertVeiculoOperavel({
          placa: "ABC1D23",
          status: VehicleStatus.DISPONIVEL,
          revisaoAdminStatus: VehicleAdminReviewStatus.REPROVADO,
        }),
      ).toThrow(BadRequestException);
    });

    it.each([VehicleStatus.BLOQUEADO, VehicleStatus.INATIVO])(
      "bloqueia veículo com status %s",
      (status) => {
        expect(() =>
          service.assertVeiculoOperavel({
            placa: "ABC1D23",
            status,
            revisaoAdminStatus: VehicleAdminReviewStatus.PRE_APROVADO,
          }),
        ).toThrow(BadRequestException);
      },
    );

    it("não bloqueia veículo pré-aprovado e disponível", () => {
      expect(() =>
        service.assertVeiculoOperavel({
          placa: "ABC1D23",
          status: VehicleStatus.DISPONIVEL,
          revisaoAdminStatus: VehicleAdminReviewStatus.PRE_APROVADO,
        }),
      ).not.toThrow();
    });

    it("não bloqueia veículo APROVADO pelo Admin Rotta", () => {
      expect(() =>
        service.assertVeiculoOperavel({
          placa: "ABC1D23",
          status: VehicleStatus.DISPONIVEL,
          revisaoAdminStatus: VehicleAdminReviewStatus.APROVADO,
        }),
      ).not.toThrow();
    });
  });

  describe("reviewVehicle (Epic A)", () => {
    beforeEach(() => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      vehicleRepository.update.mockImplementation((id, data) =>
        Promise.resolve(buildVehicle({ id, ...(data as Partial<Vehicle>) })),
      );
      usersService.listMembershipsByCompany.mockResolvedValue([
        { userId: "empresa-dona-1", role: Role.EMPRESA },
        { userId: "motorista-1", role: Role.MOTORISTA },
      ] as unknown as Membership[]);
      vehicleRepository.listActiveResponsavelIds.mockResolvedValue(["responsavel-1"]);
    });

    it("rejeita status PRE_APROVADO (não é uma decisão manual válida)", async () => {
      await expect(
        service.reviewVehicle(
          "vehicle-1",
          { status: VehicleAdminReviewStatus.PRE_APROVADO },
          adminActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("exige observacaoTransportadora ao reprovar", async () => {
      await expect(
        service.reviewVehicle(
          "vehicle-1",
          { status: VehicleAdminReviewStatus.REPROVADO },
          adminActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("aprova, grava os campos de decisão e notifica só a transportadora quando não há observação aos responsáveis", async () => {
      await service.reviewVehicle(
        "vehicle-1",
        { status: VehicleAdminReviewStatus.APROVADO },
        adminActor,
        {},
      );

      expect(vehicleRepository.update).toHaveBeenCalledWith(
        "vehicle-1",
        expect.objectContaining({
          revisaoAdminStatus: VehicleAdminReviewStatus.APROVADO,
          revisaoAdminDecididoPorId: adminActor.sub,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({ userId: "empresa-dona-1" }),
      );
      // Sem observação aos responsáveis + aprovado: nunca busca/notifica responsável nenhum.
      expect(vehicleRepository.listActiveResponsavelIds).not.toHaveBeenCalled();
    });

    it("reprova, exige motivo e notifica responsáveis mesmo sem observação específica pra eles", async () => {
      await service.reviewVehicle(
        "vehicle-1",
        {
          status: VehicleAdminReviewStatus.REPROVADO,
          observacaoTransportadora: "Documento vencido.",
        },
        adminActor,
        {},
      );

      expect(vehicleRepository.update).toHaveBeenCalledWith(
        "vehicle-1",
        expect.objectContaining({ revisaoAdminStatus: VehicleAdminReviewStatus.REPROVADO }),
      );
      expect(vehicleRepository.listActiveResponsavelIds).toHaveBeenCalledWith("vehicle-1");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({ userId: "responsavel-1" }),
      );
    });
  });

  describe("createOccurrence", () => {
    beforeEach(() => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      vehicleRepository.listActiveResponsavelIds.mockResolvedValue(["responsavel-1"]);
    });

    it("severidade BAIXA/MEDIA: só OCORRENCIA, nunca EMERGENCIA", async () => {
      occurrenceRepository.create.mockResolvedValue({
        id: "occ-1",
        vehicleId: "vehicle-1",
        companyId: "company-1",
        reportadoPorId: empresaActor.sub,
        titulo: "Pneu furado",
        descricao: "Furou na rota da manhã.",
        severidade: VehicleOccurrenceSeverity.MEDIA,
        fotoUrls: [],
        createdAt: new Date(),
      });

      await service.createOccurrence(
        "vehicle-1",
        { titulo: "Pneu furado", descricao: "Furou na rota da manhã." },
        empresaActor,
        {},
      );
      await Promise.resolve();
      await Promise.resolve();

      expect(vehicleRepository.listActiveResponsavelIds).toHaveBeenCalledWith("vehicle-1");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.OCORRENCIA,
        }),
      );
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({ tipo: NotificationEventType.EMERGENCIA }),
      );
    });

    it("severidade ALTA: dispara OCORRENCIA E EMERGENCIA pros responsáveis", async () => {
      occurrenceRepository.create.mockResolvedValue({
        id: "occ-2",
        vehicleId: "vehicle-1",
        companyId: "company-1",
        reportadoPorId: empresaActor.sub,
        titulo: "Freio falhou",
        descricao: "Freio não respondeu numa descida.",
        severidade: VehicleOccurrenceSeverity.ALTA,
        fotoUrls: [],
        createdAt: new Date(),
      });

      await service.createOccurrence(
        "vehicle-1",
        {
          titulo: "Freio falhou",
          descricao: "Freio não respondeu numa descida.",
          severidade: VehicleOccurrenceSeverity.ALTA,
        },
        empresaActor,
        {},
      );
      await Promise.resolve();
      await Promise.resolve();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.OCORRENCIA,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "communication.requested",
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.EMERGENCIA,
        }),
      );
    });
  });

  describe("acknowledgeAdminReview / listPendingAdminReviewAcknowledgements (Epic A)", () => {
    const responsavelActor: AuthenticatedUser = {
      sub: "responsavel-1",
      tenantId: null,
      role: Role.RESPONSAVEL,
      vinculoId: "vinculo-responsavel",
    };

    it("recusa reconhecer um veículo que não tem decisão pendente pra este responsável", async () => {
      vehicleRepository.listVehiclesForResponsavel.mockResolvedValue([]);
      await expect(service.acknowledgeAdminReview("vehicle-1", responsavelActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("grava o reconhecimento com o carimbo de decisão atual do veículo", async () => {
      const decisaoEm = new Date("2026-01-01T00:00:00Z");
      vehicleRepository.listVehiclesForResponsavel.mockResolvedValue([
        buildVehicle({
          revisaoAdminStatus: VehicleAdminReviewStatus.REPROVADO,
          revisaoAdminDecididoEm: decisaoEm,
        }),
      ]);

      await service.acknowledgeAdminReview("vehicle-1", responsavelActor);

      expect(vehicleRepository.createAdminReviewAcknowledgement).toHaveBeenCalledWith(
        "vehicle-1",
        "responsavel-1",
        decisaoEm,
      );
    });

    it("nunca lista aprovação sem observação (nada pra 'Li e concordo')", async () => {
      vehicleRepository.listVehiclesForResponsavel.mockResolvedValue([
        buildVehicle({
          revisaoAdminStatus: VehicleAdminReviewStatus.APROVADO,
          revisaoAdminObservacaoResponsaveis: null,
          revisaoAdminDecididoEm: new Date(),
        }),
      ]);

      const pending = await service.listPendingAdminReviewAcknowledgements(responsavelActor);
      expect(pending).toEqual([]);
    });

    it("lista reprovação mesmo sem observação específica, se ainda não reconhecida", async () => {
      const decisaoEm = new Date();
      vehicleRepository.listVehiclesForResponsavel.mockResolvedValue([
        buildVehicle({
          id: "vehicle-2",
          revisaoAdminStatus: VehicleAdminReviewStatus.REPROVADO,
          revisaoAdminObservacaoResponsaveis: null,
          revisaoAdminDecididoEm: decisaoEm,
        }),
      ]);
      vehicleRepository.existsAdminReviewAcknowledgement.mockResolvedValue(false);

      const pending = await service.listPendingAdminReviewAcknowledgements(responsavelActor);
      expect(pending).toEqual([
        expect.objectContaining({
          vehicleId: "vehicle-2",
          status: VehicleAdminReviewStatus.REPROVADO,
        }),
      ]);
    });

    it("não repete um veículo já reconhecido pra esta decisão exata", async () => {
      vehicleRepository.listVehiclesForResponsavel.mockResolvedValue([
        buildVehicle({
          revisaoAdminStatus: VehicleAdminReviewStatus.REPROVADO,
          revisaoAdminDecididoEm: new Date(),
        }),
      ]);
      vehicleRepository.existsAdminReviewAcknowledgement.mockResolvedValue(true);

      const pending = await service.listPendingAdminReviewAcknowledgements(responsavelActor);
      expect(pending).toEqual([]);
    });
  });
});
