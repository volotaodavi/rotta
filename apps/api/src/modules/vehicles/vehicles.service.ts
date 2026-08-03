import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  VehicleAssignmentRole,
  VehicleReminderType,
  type VehicleDocumentType,
  Vehicle,
  VehicleType,
} from "@prisma/client";
import { normalizePlate } from "@rotta/validators";


import { toVehicleAssignmentResponseDto } from "./mappers/vehicle-assignment.mapper";
import {
  toListVehicleChecklistsResponseDto,
  toVehicleChecklistResponseDto,
} from "./mappers/vehicle-checklist.mapper";
import { toVehicleDocumentResponseDto } from "./mappers/vehicle-document.mapper";
import {
  toListVehicleMaintenancesResponseDto,
  toVehicleMaintenanceResponseDto,
} from "./mappers/vehicle-maintenance.mapper";
import {
  toListVehicleOccurrencesResponseDto,
  toVehicleOccurrenceResponseDto,
} from "./mappers/vehicle-occurrence.mapper";
import {
  REMINDER_DUE_SOON_DAYS,
  toVehicleReminderResponseDto,
} from "./mappers/vehicle-reminder.mapper";
import { toListVehiclesResponseDto, toVehicleResponseDto } from "./mappers/vehicle.mapper";
import { vehiclesToCsv, vehiclesToExcelBuffer, vehiclesToPdfBuffer } from "./vehicle-export.util";
import {
  VEHICLE_ASSIGNMENT_REPOSITORY,
  VEHICLE_CHECKLIST_REPOSITORY,
  VEHICLE_DOCUMENT_REPOSITORY,
  VEHICLE_MAINTENANCE_REPOSITORY,
  VEHICLE_OCCURRENCE_REPOSITORY,
  VEHICLE_REMINDER_REPOSITORY,
  VEHICLE_REPOSITORY,
} from "./vehicles.constants";

import type { CreateVehicleAssignmentDto } from "./dto/create-vehicle-assignment.dto";
import type { CreateVehicleChecklistDto } from "./dto/create-vehicle-checklist.dto";
import type { CreateVehicleDocumentDto } from "./dto/create-vehicle-document.dto";
import type { CreateVehicleMaintenanceDto } from "./dto/create-vehicle-maintenance.dto";
import type { CreateVehicleOccurrenceDto } from "./dto/create-vehicle-occurrence.dto";
import type { CreateVehicleReminderDto } from "./dto/create-vehicle-reminder.dto";
import type { CreateVehicleDto } from "./dto/create-vehicle.dto";
import type { ListVehiclesQueryDto } from "./dto/list-vehicles-query.dto";
import type { UpdateVehicleLocationDto } from "./dto/update-vehicle-location.dto";
import type { UpdateVehicleReminderDto } from "./dto/update-vehicle-reminder.dto";
import type { UpdateVehicleStatusDto } from "./dto/update-vehicle-status.dto";
import type { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import type { VehicleAssignmentResponseDto } from "./dto/vehicle-assignment-response.dto";
import type {
  ListVehicleChecklistsResponseDto,
  VehicleChecklistResponseDto,
} from "./dto/vehicle-checklist-response.dto";
import type { VehicleDashboardResponseDto } from "./dto/vehicle-dashboard-response.dto";
import type { VehicleDocumentResponseDto } from "./dto/vehicle-document-response.dto";
import type {
  ListVehicleMaintenancesResponseDto,
  VehicleMaintenanceResponseDto,
} from "./dto/vehicle-maintenance-response.dto";
import type {
  ListVehicleOccurrencesResponseDto,
  VehicleOccurrenceResponseDto,
} from "./dto/vehicle-occurrence-response.dto";
import type { VehicleReminderResponseDto } from "./dto/vehicle-reminder-response.dto";
import type { ListVehiclesResponseDto, VehicleResponseDto } from "./dto/vehicle-response.dto";
import type { VehicleAssignmentRepository } from "./repositories/vehicle-assignment.repository";
import type { VehicleChecklistRepository } from "./repositories/vehicle-checklist.repository";
import type { VehicleDocumentRepository } from "./repositories/vehicle-document.repository";
import type { VehicleMaintenanceRepository } from "./repositories/vehicle-maintenance.repository";
import type { VehicleOccurrenceRepository } from "./repositories/vehicle-occurrence.repository";
import type { VehicleReminderRepository } from "./repositories/vehicle-reminder.repository";
import type { VehicleRepository } from "./repositories/vehicle.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type {
  AuditLogResponseDto,
  ListAuditLogsResponseDto,
} from "@/common/dto/audit-log-response.dto";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";

import { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { RottaAiService } from "@/modules/rotta-ai/rotta-ai.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Faixa de capacidade de passageiros esperada por tipo de veículo
 * (briefing "VALIDAÇÕES" — "capacidade mínima/máxima"). Decisão de
 * produto: em vez de um único limite global, cada `VehicleType` tem uma
 * faixa realista — evita, por exemplo, cadastrar um Sedan com 40
 * lugares.
 */
const CAPACITY_RANGE_BY_TYPE: Record<VehicleType, [number, number]> = {
  AUTOMOVEL: [1, 5],
  SEDAN: [1, 5],
  SUV: [1, 7],
  MINIVAN: [4, 8],
  VAN: [8, 16],
  MICRO_ONIBUS: [17, 32],
  ONIBUS: [33, 90],
  OUTRO: [1, 90],
};

/** `VehicleDocumentType` cujo vencimento gera um `VehicleReminder` automaticamente. */
const DOCUMENT_TYPE_TO_REMINDER_TYPE: Partial<Record<VehicleDocumentType, VehicleReminderType>> = {
  CRLV: VehicleReminderType.LICENCIAMENTO,
  LICENCIAMENTO: VehicleReminderType.LICENCIAMENTO,
  SEGURO: VehicleReminderType.SEGURO,
  VISTORIA: VehicleReminderType.VISTORIA,
};

/**
 * Núcleo de negócio do módulo Veículos (briefing "Gestão de Veículos").
 * Segue exatamente o mesmo padrão de `CompaniesService`: nunca executa
 * uma query diretamente (sempre via os 7 repositórios do módulo,
 * Repository Pattern), delega upload a `SupabaseStorageService`,
 * auditoria a `AuditLogService` (sempre best-effort) e análise de
 * documento a `RottaAiService` (stub — nunca bloqueia o upload).
 */
@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @Inject(VEHICLE_REPOSITORY) private readonly vehicleRepository: VehicleRepository,
    @Inject(VEHICLE_DOCUMENT_REPOSITORY)
    private readonly documentRepository: VehicleDocumentRepository,
    @Inject(VEHICLE_MAINTENANCE_REPOSITORY)
    private readonly maintenanceRepository: VehicleMaintenanceRepository,
    @Inject(VEHICLE_REMINDER_REPOSITORY)
    private readonly reminderRepository: VehicleReminderRepository,
    @Inject(VEHICLE_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: VehicleAssignmentRepository,
    @Inject(VEHICLE_CHECKLIST_REPOSITORY)
    private readonly checklistRepository: VehicleChecklistRepository,
    @Inject(VEHICLE_OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepository: VehicleOccurrenceRepository,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly storageService: SupabaseStorageService,
    private readonly rottaAiService: RottaAiService,
  ) {}

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  /**
   * Só `Role.ADMIN_ROTTA` acessa qualquer veículo; os demais só o da
   * própria empresa. `NotFoundException` (nunca `ForbiddenException`)
   * — mesmo princípio de não-enumeração de `CompaniesService`. Ao
   * contrário de `Company` (cujo `id` já É o tenant), o `companyId` do
   * `Vehicle` só é conhecido após buscar a linha — por isso a checagem
   * acontece depois do `findById`, nunca antes.
   */
  private assertCanAccessVehicle(
    vehicle: Vehicle | null,
    actor: AuthenticatedUser,
  ): asserts vehicle is Vehicle {
    if (!vehicle || (actor.role !== Role.ADMIN_ROTTA && vehicle.companyId !== actor.tenantId)) {
      throw new NotFoundException("Veículo não encontrado.");
    }
  }

  private assertValidCapacity(tipo: VehicleType, capacidade: number): void {
    const [min, max] = CAPACITY_RANGE_BY_TYPE[tipo];
    if (capacidade < min || capacidade > max) {
      throw new BadRequestException(
        `Capacidade de passageiros para o tipo ${tipo} deve estar entre ${min} e ${max}.`,
      );
    }
  }

  /** Auditoria é sempre best-effort — mesma justificativa de `CompaniesService.recordAudit`. */
  private async recordAudit(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.auditLogService.record(input);
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (${input.entidadeTipo} ${input.entidadeId}, ação ${input.acao})`,
        error as Error,
      );
    }
  }

  /**
   * "Motorista (somente visualizar veículo vinculado), Monitor (somente
   * visualizar veículo vinculado)" (briefing "PERMISSÕES") — aplicado
   * aqui (não apenas em `findMyVehicle`) para que TODO endpoint
   * aninhado por `:id` (documentos, manutenções, checklists,
   * ocorrências) também respeite a regra, não só a tela "Meu Veículo".
   * `NotFoundException` (não `ForbiddenException`) — mesmo princípio de
   * não-enumeração usado no restante do módulo.
   */
  private async fetchOrThrow(id: string, actor: AuthenticatedUser): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findById(id);
    this.assertCanAccessVehicle(vehicle, actor);

    if (actor.role === Role.MOTORISTA || actor.role === Role.MONITOR) {
      const papel =
        actor.role === Role.MOTORISTA
          ? VehicleAssignmentRole.MOTORISTA
          : VehicleAssignmentRole.MONITOR;
      const assignedVehicleId = await this.assignmentRepository.findCurrentVehicleIdForUser(
        actor.sub,
        papel,
      );
      if (assignedVehicleId !== id) {
        throw new NotFoundException("Veículo não encontrado.");
      }
    }

    return vehicle;
  }

  // ---------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------

  async create(
    dto: CreateVehicleDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleResponseDto> {
    this.assertValidCapacity(dto.tipo, dto.capacidadePassageiros);

    const placa = normalizePlate(dto.placa);
    const existing = await this.vehicleRepository.findByPlaca(placa);
    if (existing) {
      throw new ConflictException("Já existe um veículo cadastrado com esta placa.");
    }

    // `actor.tenantId` nunca é nulo aqui — `@Roles(EMPRESA, GESTOR)` no
    // controller já exclui `ADMIN_ROTTA` (que não tem tenant próprio).
    const vehicle = await this.vehicleRepository.create({
      companyId: actor.tenantId!,
      placa,
      modelo: dto.modelo,
      marca: dto.marca,
      ano: dto.ano,
      cor: dto.cor,
      renavam: dto.renavam,
      chassi: dto.chassi,
      capacidadePassageiros: dto.capacidadePassageiros,
      tipo: dto.tipo,
      categoria: dto.categoria,
      observacoes: dto.observacoes,
    });

    await this.recordAudit({
      companyId: vehicle.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: vehicle.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { placa: vehicle.placa, modelo: vehicle.modelo, tipo: vehicle.tipo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleResponseDto(vehicle);
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<VehicleResponseDto> {
    const vehicle = await this.fetchOrThrow(id, actor);
    return toVehicleResponseDto(vehicle);
  }

  /**
   * Escopo de tenant é resolvido pela RLS (`withTenant`) para Empresa/Gestor.
   * Admin Rotta tem `bypass: true` (sem RLS) — `companyId` é o único filtro
   * que restringe sua visão cross-tenant, e só é aplicado para esse papel
   * (mesmo padrão de `getDashboard`); se omitido, Admin Rotta vê todos os
   * tenants.
   */
  async list(
    query: ListVehiclesQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListVehiclesResponseDto> {
    const result = await this.vehicleRepository.list({
      search: query.search,
      status: query.status,
      tipo: query.tipo,
      motoristaId: query.motoristaId,
      companyId: actor.role === Role.ADMIN_ROTTA ? query.companyId : undefined,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return toListVehiclesResponseDto(result, query.page, query.pageSize);
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);

    const changedKeys = (Object.keys(dto) as (keyof UpdateVehicleDto)[]).filter(
      (key) => dto[key] !== undefined,
    );
    if (changedKeys.length === 0) {
      return toVehicleResponseDto(existing);
    }

    const effectiveTipo = dto.tipo ?? existing.tipo;
    const effectiveCapacidade = dto.capacidadePassageiros ?? existing.capacidadePassageiros;
    if (dto.tipo !== undefined || dto.capacidadePassageiros !== undefined) {
      this.assertValidCapacity(effectiveTipo, effectiveCapacidade);
    }

    const updated = await this.vehicleRepository.update(id, dto);

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: id,
      acao: "UPDATED",
      atorUserId: actor.sub,
      dadosAntes: Object.fromEntries(
        changedKeys.map((key) => [key, existing[key as keyof Vehicle]]),
      ),
      dadosDepois: Object.fromEntries(
        changedKeys.map((key) => [key, updated[key as keyof Vehicle]]),
      ),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleResponseDto(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateVehicleStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    const updated = await this.vehicleRepository.update(id, { status: dto.status });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: id,
      acao: "STATUS_CHANGED",
      atorUserId: actor.sub,
      dadosAntes: { status: existing.status },
      dadosDepois: { status: updated.status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleResponseDto(updated);
  }

  /**
   * Snapshot de última posição (briefing "LOCALIZAÇÃO") — não gera
   * entrada de auditoria (telemetria de alta frequência, não uma ação
   * de negócio auditável) nem exige que o veículo esteja `EM_VIAGEM`
   * (o próprio ping de posição não é o disparador de status; ver
   * `updateStatus`).
   */
  async updateLocation(
    id: string,
    dto: UpdateVehicleLocationDto,
    actor: AuthenticatedUser,
  ): Promise<VehicleResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);

    const updated = await this.vehicleRepository.update(id, {
      ultimaLatitude: dto.latitude,
      ultimaLongitude: dto.longitude,
      ultimaPosicaoEm: new Date(),
      viagemAtualId: dto.viagemId ?? existing.viagemAtualId,
      ...(actor.role === Role.MOTORISTA ? { ultimoMotoristaId: actor.sub } : {}),
    });

    return toVehicleResponseDto(updated);
  }

  async remove(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    const existing = await this.fetchOrThrow(id, actor);
    await this.vehicleRepository.update(id, { deletedAt: new Date() });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: id,
      acao: "DELETED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async listAuditLogs(
    id: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListAuditLogsResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);

    const { items, total } = await this.auditLogService.listByCompany(existing.companyId, {
      entidadeTipo: "Vehicle",
      entidadeId: id,
      page,
      pageSize,
    });

    return {
      items: items.map((log): AuditLogResponseDto => ({
        id: log.id,
        entidadeTipo: log.entidadeTipo,
        entidadeId: log.entidadeId,
        acao: log.acao,
        atorUserId: log.atorUserId,
        dadosAntes: log.dadosAntes,
        dadosDepois: log.dadosDepois,
        createdAt: log.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);

    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("O arquivo enviado precisa ser uma imagem.");
    }

    const extension = file.originalname.split(".").pop() ?? "png";
    const url = await this.storageService.upload(
      `vehicles/${id}/foto.${extension}`,
      file.buffer,
      file.mimetype,
    );
    const updated = await this.vehicleRepository.update(id, { fotoUrl: url });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: id,
      acao: "PHOTO_CHANGED",
      atorUserId: actor.sub,
      dadosDepois: { fotoUrl: url },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleResponseDto(updated);
  }

  // ---------------------------------------------------------------------
  // Documentos (briefing "DOCUMENTAÇÃO" + "ROTTA AI")
  // ---------------------------------------------------------------------

  async uploadDocument(
    vehicleId: string,
    dto: CreateVehicleDocumentDto,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleDocumentResponseDto> {
    const vehicle = await this.fetchOrThrow(vehicleId, actor);

    const isPdf = file.mimetype === "application/pdf";
    const isImage = file.mimetype.startsWith("image/");
    if (!isPdf && !isImage) {
      throw new BadRequestException("O documento precisa ser um PDF ou uma imagem.");
    }

    const extension = file.originalname.split(".").pop() ?? (isPdf ? "pdf" : "jpg");
    const url = await this.storageService.upload(
      `vehicles/${vehicleId}/documents/${randomUUID()}.${extension}`,
      file.buffer,
      file.mimetype,
    );

    let document = await this.documentRepository.create({
      vehicleId,
      companyId: vehicle.companyId,
      maintenanceId: dto.maintenanceId,
      tipo: dto.tipo,
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
      fileUrl: url,
      vencimentoEm: dto.vencimentoEm ? new Date(dto.vencimentoEm) : undefined,
      uploadedByUserId: actor.sub,
    });

    await this.recordAudit({
      companyId: vehicle.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: vehicleId,
      acao: "DOCUMENT_UPLOADED",
      atorUserId: actor.sub,
      dadosDepois: { documentId: document.id, tipo: document.tipo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (document.vencimentoEm) {
      await this.upsertReminderFromDocument(
        vehicleId,
        vehicle.companyId,
        document.tipo,
        document.vencimentoEm,
        document.id,
      );
    }

    document = await this.analyzeDocumentWithRottaAi(document.id, document.tipo, url);

    return toVehicleDocumentResponseDto(document);
  }

  /**
   * Best-effort: a Rotta AI é um stub (`RottaAiService.analyzeVehicleDocument`
   * sempre lança `NotImplementedException` hoje) — o upload já está
   * concluído e persistido antes desta chamada; uma falha (ou a
   * indisponibilidade esperada) aqui só atualiza o status da análise,
   * nunca desfaz o upload.
   */
  private async analyzeDocumentWithRottaAi(
    documentId: string,
    tipo: VehicleDocumentType,
    fileUrl: string,
  ) {
    if (tipo === "OUTRO") {
      return this.documentRepository.findById(documentId).then((doc) => doc!);
    }

    try {
      await this.rottaAiService.analyzeVehicleDocument({ tipo, referenciaArquivo: fileUrl });
      // Inalcançável hoje (o stub sempre lança) — mantido para quando um provedor real existir.
      return this.documentRepository.findById(documentId).then((doc) => doc!);
    } catch (error) {
      this.logger.warn(
        `Rotta AI indisponível para análise do documento ${documentId} — mantendo status pendente/indisponível.`,
        error as Error,
      );
      return this.documentRepository.updateAiResult(documentId, {
        rottaAiStatus: "INDISPONIVEL",
        rottaAiAnalisadoEm: new Date(),
        rottaAiObservacoes:
          "Integração com provedor de OCR/visão computacional ainda não configurada.",
      });
    }
  }

  private async upsertReminderFromDocument(
    vehicleId: string,
    companyId: string,
    tipo: VehicleDocumentType,
    vencimentoEm: Date,
    documentId: string,
  ): Promise<void> {
    const reminderType = DOCUMENT_TYPE_TO_REMINDER_TYPE[tipo];
    if (!reminderType) {
      return;
    }

    const pending = await this.reminderRepository.findPendingByVehicleAndType(
      vehicleId,
      reminderType,
    );
    if (pending) {
      await this.reminderRepository.update(pending.id, { dataAlvo: vencimentoEm });
      return;
    }

    await this.reminderRepository.create({
      vehicleId,
      companyId,
      tipo: reminderType,
      dataAlvo: vencimentoEm,
      origemDocumentoId: documentId,
    });
  }

  async listDocuments(
    vehicleId: string,
    actor: AuthenticatedUser,
    tipo?: VehicleDocumentType,
  ): Promise<VehicleDocumentResponseDto[]> {
    await this.fetchOrThrow(vehicleId, actor);
    const documents = await this.documentRepository.listByVehicle({ vehicleId, tipo });
    return documents.map(toVehicleDocumentResponseDto);
  }

  async removeDocument(
    vehicleId: string,
    documentId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<void> {
    const vehicle = await this.fetchOrThrow(vehicleId, actor);
    const document = await this.documentRepository.findById(documentId);
    if (!document || document.vehicleId !== vehicleId) {
      throw new NotFoundException("Documento não encontrado.");
    }

    await this.documentRepository.softDelete(documentId);

    await this.recordAudit({
      companyId: vehicle.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: vehicleId,
      acao: "DOCUMENT_REMOVED",
      atorUserId: actor.sub,
      dadosAntes: { documentId, tipo: document.tipo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  // ---------------------------------------------------------------------
  // Manutenção (briefing "MANUTENÇÃO")
  // ---------------------------------------------------------------------

  async createMaintenance(
    vehicleId: string,
    dto: CreateVehicleMaintenanceDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleMaintenanceResponseDto> {
    const vehicle = await this.fetchOrThrow(vehicleId, actor);

    const maintenance = await this.maintenanceRepository.create({
      vehicleId,
      companyId: vehicle.companyId,
      tipo: dto.tipo,
      data: new Date(dto.data),
      quilometragem: dto.quilometragem,
      valorCentavos: dto.valorCentavos,
      fornecedor: dto.fornecedor,
      observacoes: dto.observacoes,
      registradoPorId: actor.sub,
    });

    if (dto.quilometragem !== undefined && dto.quilometragem > vehicle.quilometragemAtual) {
      await this.vehicleRepository.update(vehicleId, { quilometragemAtual: dto.quilometragem });
    }

    await this.recordAudit({
      companyId: vehicle.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: vehicleId,
      acao: "MAINTENANCE_REGISTERED",
      atorUserId: actor.sub,
      dadosDepois: { maintenanceId: maintenance.id, tipo: maintenance.tipo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleMaintenanceResponseDto(maintenance);
  }

  async listMaintenances(
    vehicleId: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListVehicleMaintenancesResponseDto> {
    await this.fetchOrThrow(vehicleId, actor);
    const result = await this.maintenanceRepository.list({ vehicleId, page, pageSize });
    return toListVehicleMaintenancesResponseDto(result, page, pageSize);
  }

  // ---------------------------------------------------------------------
  // Lembretes (briefing "LEMBRETES")
  // ---------------------------------------------------------------------

  async createReminder(
    vehicleId: string,
    dto: CreateVehicleReminderDto,
    actor: AuthenticatedUser,
  ): Promise<VehicleReminderResponseDto> {
    const vehicle = await this.fetchOrThrow(vehicleId, actor);

    const reminder = await this.reminderRepository.create({
      vehicleId,
      companyId: vehicle.companyId,
      tipo: dto.tipo,
      dataAlvo: new Date(dto.dataAlvo),
      quilometragemAlvo: dto.quilometragemAlvo,
      observacoes: dto.observacoes,
    });

    return toVehicleReminderResponseDto(reminder);
  }

  async updateReminderStatus(
    vehicleId: string,
    reminderId: string,
    dto: UpdateVehicleReminderDto,
    actor: AuthenticatedUser,
  ): Promise<VehicleReminderResponseDto> {
    await this.fetchOrThrow(vehicleId, actor);
    const existing = await this.reminderRepository.findById(reminderId);
    if (!existing || existing.vehicleId !== vehicleId) {
      throw new NotFoundException("Lembrete não encontrado.");
    }

    const updated = await this.reminderRepository.update(reminderId, {
      status: dto.status,
      concluidoEm: dto.status === "CONCLUIDO" ? new Date() : null,
    });

    return toVehicleReminderResponseDto(updated);
  }

  async listReminders(
    vehicleId: string,
    actor: AuthenticatedUser,
  ): Promise<VehicleReminderResponseDto[]> {
    await this.fetchOrThrow(vehicleId, actor);
    const reminders = await this.reminderRepository.listByVehicle(vehicleId);
    return reminders.map(toVehicleReminderResponseDto);
  }

  // ---------------------------------------------------------------------
  // Vínculos Motorista/Monitor (briefing "VINCULAÇÃO")
  // ---------------------------------------------------------------------

  async assign(
    vehicleId: string,
    dto: CreateVehicleAssignmentDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleAssignmentResponseDto> {
    const vehicle = await this.fetchOrThrow(vehicleId, actor);

    const expectedRole =
      dto.papel === VehicleAssignmentRole.MOTORISTA ? Role.MOTORISTA : Role.MONITOR;
    const membership = await this.usersService.findActiveMembership(dto.userId, vehicle.companyId);
    if (!membership || (membership.role as Role) !== expectedRole) {
      throw new BadRequestException(
        `O usuário informado não possui um vínculo ativo de ${expectedRole} nesta empresa.`,
      );
    }

    // "Um veículo poderá ser utilizado por diferentes motoristas ao
    // longo do tempo... Todo histórico deverá ser preservado" — encerra
    // o vínculo vigente (nunca apaga) antes de criar o novo.
    await this.assignmentRepository.encerraCurrent(vehicleId, dto.papel);
    const assignment = await this.assignmentRepository.create({
      vehicleId,
      companyId: vehicle.companyId,
      papel: dto.papel,
      userId: dto.userId,
      criadoPorId: actor.sub,
    });

    await this.vehicleRepository.update(vehicleId, {
      ...(dto.papel === VehicleAssignmentRole.MOTORISTA
        ? { ultimoMotoristaId: dto.userId }
        : { ultimoMonitorId: dto.userId }),
    });

    await this.recordAudit({
      companyId: vehicle.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: vehicleId,
      acao: dto.papel === VehicleAssignmentRole.MOTORISTA ? "DRIVER_CHANGED" : "MONITOR_CHANGED",
      atorUserId: actor.sub,
      dadosDepois: { userId: dto.userId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleAssignmentResponseDto(assignment);
  }

  async listAssignmentHistory(
    vehicleId: string,
    actor: AuthenticatedUser,
  ): Promise<VehicleAssignmentResponseDto[]> {
    await this.fetchOrThrow(vehicleId, actor);
    const history = await this.assignmentRepository.listHistoryByVehicle(vehicleId);
    return history.map(toVehicleAssignmentResponseDto);
  }

  /** "Meu Veículo" (app mobile) — veículo atualmente vinculado ao Motorista/Monitor autenticado. */
  async findMyVehicle(actor: AuthenticatedUser): Promise<VehicleResponseDto | null> {
    const papel =
      actor.role === Role.MOTORISTA
        ? VehicleAssignmentRole.MOTORISTA
        : VehicleAssignmentRole.MONITOR;
    const vehicleId = await this.assignmentRepository.findCurrentVehicleIdForUser(actor.sub, papel);
    if (!vehicleId) {
      return null;
    }
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    return vehicle ? toVehicleResponseDto(vehicle) : null;
  }

  // ---------------------------------------------------------------------
  // Checklist (briefing "CHECKLIST")
  // ---------------------------------------------------------------------

  async createChecklist(
    vehicleId: string,
    dto: CreateVehicleChecklistDto,
    actor: AuthenticatedUser,
  ): Promise<VehicleChecklistResponseDto> {
    const vehicle = await this.fetchOrThrow(vehicleId, actor);

    const checklist = await this.checklistRepository.create({
      vehicleId,
      companyId: vehicle.companyId,
      motoristaId: actor.sub,
      viagemId: dto.viagemId,
      pneusOk: dto.pneusOk,
      lucesOk: dto.lucesOk,
      combustivelOk: dto.combustivelOk,
      limpezaOk: dto.limpezaOk,
      equipamentosObrigatoriosOk: dto.equipamentosObrigatoriosOk,
      observacoes: dto.observacoes,
    });

    return toVehicleChecklistResponseDto(checklist);
  }

  async listChecklists(
    vehicleId: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListVehicleChecklistsResponseDto> {
    await this.fetchOrThrow(vehicleId, actor);
    const result = await this.checklistRepository.list({ vehicleId, page, pageSize });
    return toListVehicleChecklistsResponseDto(result, page, pageSize);
  }

  // ---------------------------------------------------------------------
  // Ocorrências (briefing "APP MOBILE")
  // ---------------------------------------------------------------------

  async createOccurrence(
    vehicleId: string,
    dto: CreateVehicleOccurrenceDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleOccurrenceResponseDto> {
    const vehicle = await this.fetchOrThrow(vehicleId, actor);

    const occurrence = await this.occurrenceRepository.create({
      vehicleId,
      companyId: vehicle.companyId,
      reportadoPorId: actor.sub,
      titulo: dto.titulo,
      descricao: dto.descricao,
      severidade: dto.severidade,
      fotoUrls: dto.fotoUrls,
    });

    await this.recordAudit({
      companyId: vehicle.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: vehicleId,
      acao: "OCCURRENCE_REPORTED",
      atorUserId: actor.sub,
      dadosDepois: { occurrenceId: occurrence.id, titulo: occurrence.titulo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleOccurrenceResponseDto(occurrence);
  }

  async listOccurrences(
    vehicleId: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListVehicleOccurrencesResponseDto> {
    await this.fetchOrThrow(vehicleId, actor);
    const result = await this.occurrenceRepository.list({ vehicleId, page, pageSize });
    return toListVehicleOccurrencesResponseDto(result, page, pageSize);
  }

  // ---------------------------------------------------------------------
  // Dashboard (briefing "DASHBOARD")
  // ---------------------------------------------------------------------

  async getDashboard(
    actor: AuthenticatedUser,
    companyIdParam?: string,
  ): Promise<VehicleDashboardResponseDto> {
    const companyId = actor.role === Role.ADMIN_ROTTA ? companyIdParam : actor.tenantId;
    if (!companyId) {
      throw new BadRequestException(
        "Informe `companyId` para consultar o dashboard como Admin Rotta.",
      );
    }

    const vehicles = await this.vehicleRepository.listAllActive(companyId);
    const expiringDocuments = await this.documentRepository.listExpiringSoon(
      companyId,
      REMINDER_DUE_SOON_DAYS,
    );
    const pendingReminders = await this.reminderRepository.listPendingByCompany(companyId);

    const now = Date.now();
    const dueSoonLimit = now + REMINDER_DUE_SOON_DAYS * 24 * 60 * 60 * 1000;

    const alertas: string[] = [
      ...expiringDocuments.map(
        (doc) =>
          `Documento ${doc.tipo} vence em ${doc.vencimentoEm?.toLocaleDateString("pt-BR") ?? "data desconhecida"}.`,
      ),
      ...pendingReminders
        .filter((reminder) => reminder.dataAlvo.getTime() <= dueSoonLimit)
        .map(
          (reminder) =>
            `Lembrete de ${reminder.tipo} ${reminder.dataAlvo.getTime() < now ? "vencido" : "vencendo"} em ${reminder.dataAlvo.toLocaleDateString("pt-BR")}.`,
        ),
    ];

    return {
      totalVeiculos: vehicles.length,
      veiculosAtivos: vehicles.filter((v) => v.status !== "INATIVO" && v.status !== "BLOQUEADO")
        .length,
      veiculosEmViagem: vehicles.filter((v) => v.status === "EM_VIAGEM").length,
      veiculosEmManutencao: vehicles.filter((v) => v.status === "MANUTENCAO").length,
      capacidadeTotalPassageiros: vehicles.reduce((sum, v) => sum + v.capacidadePassageiros, 0),
      quilometragemTotal: vehicles.reduce((sum, v) => sum + v.quilometragemAtual, 0),
      documentosVencendo: expiringDocuments.length,
      alertas,
    };
  }

  /**
   * Contagem de veículos ativos de uma empresa, para consumo por OUTROS
   * módulos (ex. `CompaniesService.getDashboard`, campo "Veículos" de
   * "Minha Empresa") — nunca leem o repositório de Veículos diretamente,
   * sempre por este método público do service.
   */
  async countActive(companyId: string): Promise<number> {
    return (await this.vehicleRepository.listAllActive(companyId)).length;
  }

  // ---------------------------------------------------------------------
  // Exportação (briefing "EXPORTAÇÃO")
  // ---------------------------------------------------------------------

  async exportList(
    query: ListVehiclesQueryDto,
    actor: AuthenticatedUser,
    format: "csv" | "excel" | "pdf",
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const { items } = await this.vehicleRepository.list({
      search: query.search,
      status: query.status,
      tipo: query.tipo,
      motoristaId: query.motoristaId,
      page: 1,
      pageSize: 10_000,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    const vehicles = items.map(toVehicleResponseDto);

    if (format === "csv") {
      return {
        buffer: Buffer.from(vehiclesToCsv(vehicles), "utf-8"),
        contentType: "text/csv; charset=utf-8",
        filename: "veiculos.csv",
      };
    }

    if (format === "excel") {
      return {
        buffer: await vehiclesToExcelBuffer(vehicles),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: "veiculos.xlsx",
      };
    }

    return {
      buffer: await vehiclesToPdfBuffer(vehicles),
      contentType: "application/pdf",
      filename: "veiculos.pdf",
    };
  }
}
