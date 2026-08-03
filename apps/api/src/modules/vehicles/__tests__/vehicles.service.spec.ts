import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { VehicleAssignmentRole, VehicleCategory, VehicleStatus, VehicleType } from "@prisma/client";


import { VehiclesService } from "../vehicles.service";

import type { CreateVehicleDto } from "../dto/create-vehicle.dto";
import type { VehicleAssignmentRepository } from "../repositories/vehicle-assignment.repository";
import type { VehicleChecklistRepository } from "../repositories/vehicle-checklist.repository";
import type { VehicleDocumentRepository } from "../repositories/vehicle-document.repository";
import type { VehicleMaintenanceRepository } from "../repositories/vehicle-maintenance.repository";
import type { VehicleOccurrenceRepository } from "../repositories/vehicle-occurrence.repository";
import type { VehicleReminderRepository } from "../repositories/vehicle-reminder.repository";
import type { VehicleRepository } from "../repositories/vehicle.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { RottaAiService } from "@/modules/rotta-ai/rotta-ai.service";
import type { UsersService } from "@/modules/users/users.service";
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
    observacoes: null,
    fotoUrl: null,
    status: VehicleStatus.DISPONIVEL,
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

  beforeEach(() => {
    vehicleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPlaca: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      listAllActive: jest.fn(),
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
    } as unknown as jest.Mocked<UsersService>;
    auditLogService = {
      record: jest.fn(),
      listByCompany: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;
    storageService = { upload: jest.fn() } as unknown as jest.Mocked<SupabaseStorageService>;
    rottaAiService = {
      validateDocument: jest.fn(),
      analyzeVehicleDocument: jest.fn(),
    };

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
    );

    vehicleRepository.findByPlaca.mockResolvedValue(null);
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

    it("cria o documento, marca a análise da Rotta AI como indisponível (stub) e gera lembrete de vencimento", async () => {
      vehicleRepository.findById.mockResolvedValue(buildVehicle());
      storageService.upload.mockResolvedValue("https://storage.test/doc.pdf");
      const created = buildDocument({ vencimentoEm: new Date("2027-01-01") });
      documentRepository.create.mockResolvedValue(created);
      rottaAiService.analyzeVehicleDocument.mockRejectedValue(new Error("stub"));
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

      expect(documentRepository.create).toHaveBeenCalled();
      expect(reminderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: "LICENCIAMENTO" }),
      );
      expect(result.rottaAiStatus).toBe("INDISPONIVEL");
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
});
