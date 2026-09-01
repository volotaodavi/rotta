import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  NotificationEventType,
  VehicleAdminReviewStatus,
  VehicleAssignmentRole,
  VehicleCategoryOrigin,
  VehicleCategoryReviewStatus,
  VehicleOccurrenceSeverity,
  VehicleReminderType,
  VehicleStatus,
  type VehicleCategory,
  type VehicleDocumentType,
  type VehicleOccurrence,
  Vehicle,
  VehicleType,
} from "@prisma/client";
import { isValidPlate, normalizePlate } from "@rotta/validators";

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
import {
  VEHICLE_CATEGORY_CONFIDENCE_THRESHOLD,
  VehicleCategoryClassifierService,
} from "./vehicle-category-classifier.service";
import { vehiclesToCsv, vehiclesToExcelBuffer, vehiclesToPdfBuffer } from "./vehicle-export.util";
import { VehiclePlateLookupService } from "./vehicle-plate-lookup.service";
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
import type { ListVehicleCategoryReviewQueryDto } from "./dto/list-vehicle-category-review-query.dto";
import type { ListVehiclesQueryDto } from "./dto/list-vehicles-query.dto";
import type { ResolveVehicleCategoryReviewDto } from "./dto/resolve-vehicle-category-review.dto";
import type { ReviewVehicleDto } from "./dto/review-vehicle.dto";
import type { UpdateVehicleLocationDto } from "./dto/update-vehicle-location.dto";
import type { UpdateVehicleReminderDto } from "./dto/update-vehicle-reminder.dto";
import type { UpdateVehicleStatusDto } from "./dto/update-vehicle-status.dto";
import type { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import type { VehicleAdminReviewPendingDto } from "./dto/vehicle-admin-review-pending.dto";
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
import type { VehiclePlateLookupResult } from "./vehicle-plate-lookup.service";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type {
  AuditLogResponseDto,
  ListAuditLogsResponseDto,
} from "@/common/dto/audit-log-response.dto";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";

import { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
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
    private readonly plateLookupService: VehiclePlateLookupService,
    private readonly categoryClassifier: VehicleCategoryClassifierService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
  ) {}

  /**
   * "Buscar pela placa" (pedido do usuário) — valida o formato ANTES de
   * gastar uma chamada no provedor externo (mesmo cuidado de
   * `assertValidPlateOrThrow` em `create`/`update`). Ver
   * `VehiclePlateLookupService` para o que acontece sem provedor
   * configurado.
   */
  async lookupByPlate(placa: string): Promise<VehiclePlateLookupResult> {
    if (!isValidPlate(placa)) {
      throw new BadRequestException("Placa inválida.");
    }
    return this.plateLookupService.lookup(normalizePlate(placa));
  }

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

  /**
   * Frente AL — "é muito chato ter que colocar se o carro é fretamento,
   * particular ou escolar". Quando a empresa NÃO escolhe `categoria` no
   * cadastro (ou na edição), o agente `VehicleCategoryClassifierService`
   * decide sozinho a partir de `tipo`/`capacidadePassageiros`
   * (`categoriaOrigem: IA`); confiança abaixo do limiar marca
   * `categoriaRevisaoStatus: PENDENTE`, mas o veículo já fica pronto
   * pra uso com a categoria sugerida — "o usuário da Rotta pode
   * continuar usando a plataforma do jeito que foi cadastrado e
   * autorgado pela IA", sem travar em nenhum momento. Quando a empresa
   * ESCOLHE a categoria manualmente (continua possível — "pode deixar
   * como opção"), a origem é `MANUAL` e não há nada pra revisar.
   */
  private resolveCategoryFields(
    tipo: VehicleType,
    capacidadePassageiros: number,
    categoriaEscolhida: VehicleCategory | undefined,
  ): {
    categoria: VehicleCategory;
    categoriaOrigem: VehicleCategoryOrigin;
    categoriaRevisaoStatus: VehicleCategoryReviewStatus;
    categoriaConfiancaIa: number | null;
    categoriaMotivoIa: string | null;
  } {
    if (categoriaEscolhida !== undefined) {
      return {
        categoria: categoriaEscolhida,
        categoriaOrigem: VehicleCategoryOrigin.MANUAL,
        categoriaRevisaoStatus: VehicleCategoryReviewStatus.NAO_REQUER,
        categoriaConfiancaIa: null,
        categoriaMotivoIa: null,
      };
    }

    const classification = this.categoryClassifier.classify(tipo, capacidadePassageiros);
    return {
      categoria: classification.categoria,
      categoriaOrigem: VehicleCategoryOrigin.IA,
      categoriaRevisaoStatus:
        classification.confianca < VEHICLE_CATEGORY_CONFIDENCE_THRESHOLD
          ? VehicleCategoryReviewStatus.PENDENTE
          : VehicleCategoryReviewStatus.NAO_REQUER,
      categoriaConfiancaIa: classification.confianca,
      categoriaMotivoIa: classification.motivo,
    };
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

    const categoryFields = this.resolveCategoryFields(
      dto.tipo,
      dto.capacidadePassageiros,
      dto.categoria,
    );

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
      categoria: categoryFields.categoria,
      categoriaOrigem: categoryFields.categoriaOrigem,
      categoriaRevisaoStatus: categoryFields.categoriaRevisaoStatus,
      categoriaConfiancaIa: categoryFields.categoriaConfiancaIa ?? undefined,
      categoriaMotivoIa: categoryFields.categoriaMotivoIa ?? undefined,
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
   * ACHADO CRÍTICO (achado real em produção, testado ao vivo): esta
   * função assumia que a RLS do banco (`withTenant`) bastava como
   * filtro de tenant para Empresa/Gestor, deixando `companyId` como
   * `undefined` pra eles — ou seja, SEM NENHUM filtro de tenant no
   * `where` do Prisma. Uma Empresa nova, sem veículo próprio, recebia
   * os veículos de TODAS as empresas. RLS é defesa em profundidade,
   * nunca o único filtro — `MANAGE_ROLES` (único grupo com acesso a
   * este endpoint) sempre tem `tenantId` resolvido pelo `TenantGuard`
   * exceto Admin Rotta, cujo `companyId` continua vindo de
   * `query.companyId` (mesmo padrão de `getDashboard`; se omitido,
   * Admin Rotta vê todos os tenants — intencional).
   */
  async list(
    query: ListVehiclesQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListVehiclesResponseDto> {
    const companyId = actor.role === Role.ADMIN_ROTTA ? query.companyId : actor.tenantId!;

    const result = await this.vehicleRepository.list({
      search: query.search,
      status: query.status,
      tipo: query.tipo,
      motoristaId: query.motoristaId,
      companyId,
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

    // Escolher `categoria` manualmente na edição encerra qualquer
    // revisão pendente da IA (mesma regra do cadastro — ver
    // `resolveCategoryFields`): nunca deixa uma sugestão/confiança
    // antiga pendurada numa categoria que a empresa já corrigiu à mão.
    const categoryOverride =
      dto.categoria !== undefined
        ? {
            categoriaOrigem: VehicleCategoryOrigin.MANUAL,
            categoriaRevisaoStatus: VehicleCategoryReviewStatus.NAO_REQUER,
            categoriaConfiancaIa: null,
            categoriaMotivoIa: null,
            categoriaRevisadaPorId: null,
            categoriaRevisadaEm: null,
          }
        : {};

    const updated = await this.vehicleRepository.update(id, { ...dto, ...categoryOverride });

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

  /**
   * Sincroniza `Vehicle.viagemAtualId` a partir do módulo Trips
   * (`TripsService.start`/`finish`/`cancel`) — nunca passa pelo
   * `fetchOrThrow` baseado em ator (o chamador já validou que o veículo
   * pertence à viagem, não há um `AuthenticatedUser` de RBAC aqui).
   * `null` limpa o vínculo ao encerrar/cancelar a viagem.
   */
  async setCurrentTrip(
    vehicleId: string,
    viagemAtualId: string | null,
  ): Promise<VehicleResponseDto> {
    return toVehicleResponseDto(await this.vehicleRepository.update(vehicleId, { viagemAtualId }));
  }

  /**
   * Atualização de posição feita pelo módulo Trips durante uma viagem
   * EM_ANDAMENTO (GPS-01/02) — já validado ali que o ator é o motorista
   * da própria viagem; por isso, diferente de `updateLocation` (chamado
   * via `PATCH /vehicles/:id/location`), não repete a checagem de
   * `VehicleAssignment`: `Trip.veiculoId`/`Trip.motoristaId` já são a
   * fonte de verdade da viagem em curso, que pode usar um veículo
   * diferente do vínculo "padrão" (ex. substituição pontual).
   */
  async updateLocationFromTrip(
    vehicleId: string,
    data: { latitude: number; longitude: number; capturadaEm: Date; viagemId: string },
  ): Promise<void> {
    await this.vehicleRepository.update(vehicleId, {
      ultimaLatitude: data.latitude,
      ultimaLongitude: data.longitude,
      ultimaPosicaoEm: data.capturadaEm,
      viagemAtualId: data.viagemId,
    });
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
    // uploadPrivate (Dossiê 32): documento oficial do veículo (ex. CRLV)
    // pode conter dado pessoal do proprietário — nunca URL pública previsível.
    // `filePath` é o que persiste (Dossiê 45, achado C3) — releituras
    // assinam uma URL nova de curta validade em vez de reusar `url`.
    const { path, url } = await this.storageService.uploadPrivate(
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
      filePath: path,
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

    return toVehicleDocumentResponseDto(document, await this.resolvePrivateFileUrl(document));
  }

  /** Ver nota em `toVehicleDocumentResponseDto` (Dossiê 45, achado C3). */
  private async resolvePrivateFileUrl(document: {
    fileUrl: string;
    filePath: string | null;
  }): Promise<string> {
    if (!document.filePath) return document.fileUrl;
    return this.storageService.getSignedUrl(document.filePath);
  }

  /**
   * Best-effort: o upload já está concluído e persistido antes desta
   * chamada; uma falha (ex. Supabase Storage indisponível para o Rotta
   * AI baixar o arquivo de volta) aqui só atualiza o status da análise,
   * nunca desfaz o upload.
   *
   * `RottaAiService.analyzeVehicleDocument` (Frente E) hoje só verifica
   * formato/resolução da imagem — nunca o conteúdo do documento. Por
   * isso o mapeamento é deliberadamente assimétrico:
   * `qualidadeAdequada: false` é um defeito real e concreto → REPROVADO;
   * `qualidadeAdequada: true` só significa "não achamos problema no que
   * conseguimos checar" → continua PENDENTE (nunca APROVADO, que
   * exigiria verificar o conteúdo em si — ver `resultado.avisos` para o
   * aviso de escopo, sempre gravado em `rottaAiObservacoes`).
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
      const resultado = await this.rottaAiService.analyzeVehicleDocument({
        tipo,
        referenciaArquivo: fileUrl,
      });
      return this.documentRepository.updateAiResult(documentId, {
        rottaAiStatus: resultado.qualidadeAdequada ? "PENDENTE" : "REPROVADO",
        rottaAiAnalisadoEm: new Date(),
        rottaAiObservacoes: resultado.avisos.join(" "),
      });
    } catch (error) {
      this.logger.warn(
        `Rotta AI indisponível para análise do documento ${documentId} — mantendo status pendente/indisponível.`,
        error as Error,
      );
      return this.documentRepository.updateAiResult(documentId, {
        rottaAiStatus: "INDISPONIVEL",
        rottaAiAnalisadoEm: new Date(),
        rottaAiObservacoes:
          "Não foi possível baixar o arquivo para análise de qualidade de imagem.",
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
    return Promise.all(
      documents.map(async (document) =>
        toVehicleDocumentResponseDto(document, await this.resolvePrivateFileUrl(document)),
      ),
    );
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

    this.notifyOccurrenceBestEffort(occurrence);

    return toVehicleOccurrenceResponseDto(occurrence);
  }

  /**
   * Avisa os responsáveis das rotas ativas deste veículo sobre a
   * ocorrência (pedido do usuário 01/09/2026: "ocorrência"/"emergência"
   * — `OCORRENCIA`/`EMERGENCIA` já existiam configuradas no
   * `NotificationChannelSelectorService`, mas nenhum código disparava).
   *
   * `EMERGENCIA` não tem um botão de pânico dedicado hoje — em vez de
   * inventar uma feature nova fora do escopo pedido, reaproveitamos o
   * sinal que já existe: severidade `ALTA` já é, na prática, como
   * motorista/monitor comunicam algo grave (`VehicleOccurrenceSeverity`
   * não tem um nível "crítico" à parte). `ALTA` dispara os DOIS eventos
   * (`OCORRENCIA` normal + `EMERGENCIA`, canal com SMS) — nunca troca
   * um pelo outro, cada aviso continua íntegro no histórico. `BAIXA`/
   * `MEDIA` disparam só `OCORRENCIA`.
   *
   * Mesmo padrão de destinatário de `notifyAdminReviewDecisionBestEffort`
   * (`vehicleRepository.listActiveResponsavelIds`) — sem nome de aluno
   * específico aqui (ocorrência é reportada no nível do VEÍCULO, não de
   * um aluno): `ocorrencia()`/`emergencia()` usam "seu filho" como
   * referência genérica, mesmo texto que qualquer app de transporte
   * escolar usaria pra um aviso que vale pra todos os alunos daquele
   * veículo.
   */
  private notifyOccurrenceBestEffort(occurrence: VehicleOccurrence): void {
    this.vehicleRepository
      .listActiveResponsavelIds(occurrence.vehicleId)
      .then((responsavelIds) => {
        const isEmergencia = occurrence.severidade === VehicleOccurrenceSeverity.ALTA;
        const mensagemOcorrencia = this.messagePersonalizationService.ocorrencia(
          "seu filho",
          occurrence.descricao,
        );
        const mensagemEmergencia = isEmergencia
          ? this.messagePersonalizationService.emergencia(occurrence.descricao)
          : null;

        for (const responsavelId of responsavelIds) {
          this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
            userId: responsavelId,
            companyId: occurrence.companyId,
            tipo: NotificationEventType.OCORRENCIA,
            titulo: mensagemOcorrencia.titulo,
            corpo: mensagemOcorrencia.corpo,
            dadosContexto: { vehicleId: occurrence.vehicleId, occurrenceId: occurrence.id },
          });
          if (mensagemEmergencia) {
            this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
              userId: responsavelId,
              companyId: occurrence.companyId,
              tipo: NotificationEventType.EMERGENCIA,
              titulo: mensagemEmergencia.titulo,
              corpo: mensagemEmergencia.corpo,
              dadosContexto: { vehicleId: occurrence.vehicleId, occurrenceId: occurrence.id },
            });
          }
        }
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Falha ao notificar responsáveis sobre a ocorrência ${occurrence.id} do veículo ${occurrence.vehicleId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
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

  /**
   * ACHADO CRÍTICO (achado real em produção, testado ao vivo — mesmo
   * incidente do `list()` acima): faltava `companyId` aqui por completo,
   * nem condicional a Admin Rotta — qualquer Empresa/Gestor exportava a
   * frota de TODAS as empresas em CSV/Excel/PDF.
   */
  async exportList(
    query: ListVehiclesQueryDto,
    actor: AuthenticatedUser,
    format: "csv" | "excel" | "pdf",
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const companyId = actor.role === Role.ADMIN_ROTTA ? query.companyId : actor.tenantId!;

    const { items } = await this.vehicleRepository.list({
      search: query.search,
      status: query.status,
      tipo: query.tipo,
      motoristaId: query.motoristaId,
      companyId,
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

  // ---------------------------------------------------------------------
  // Revisão de categoria sugerida pela IA (Frente AL — "os admins da
  // Rotta irão analisar manualmente a situação")
  // ---------------------------------------------------------------------

  /** `GET /vehicles/revisao-categoria` — só Admin Rotta, cross-tenant por natureza (ver `VehicleRepository.listPendingCategoryReview`). */
  async listCategoryReview(
    query: ListVehicleCategoryReviewQueryDto,
  ): Promise<ListVehiclesResponseDto> {
    const result = await this.vehicleRepository.listPendingCategoryReview({
      companyId: query.companyId,
      page: query.page,
      pageSize: query.pageSize,
    });
    return toListVehiclesResponseDto(result, query.page, query.pageSize);
  }

  /**
   * `PATCH /vehicles/:id/revisao-categoria` — sem `categoria` no corpo
   * confirma a sugestão da IA; com uma `categoria` diferente, corrige.
   * Nunca aplicável a um veículo que não está `PENDENTE` (evita um
   * admin "confirmar" duas vezes ou revisar algo que a própria empresa
   * já corrigiu manualmente entretanto).
   */
  async resolveCategoryReview(
    id: string,
    dto: ResolveVehicleCategoryReviewDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    if (existing.categoriaRevisaoStatus !== VehicleCategoryReviewStatus.PENDENTE) {
      throw new BadRequestException("Este veículo não está aguardando revisão de categoria.");
    }

    const corrigiu = dto.categoria !== undefined && dto.categoria !== existing.categoria;
    const updated = await this.vehicleRepository.update(id, {
      ...(corrigiu ? { categoria: dto.categoria } : {}),
      categoriaRevisaoStatus: corrigiu
        ? VehicleCategoryReviewStatus.CORRIGIDA
        : VehicleCategoryReviewStatus.CONFIRMADA,
      categoriaRevisadaPorId: actor.sub,
      categoriaRevisadaEm: new Date(),
    });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: id,
      acao: corrigiu ? "CATEGORY_REVIEW_CORRECTED" : "CATEGORY_REVIEW_CONFIRMED",
      atorUserId: actor.sub,
      dadosAntes: { categoria: existing.categoria },
      dadosDepois: { categoria: updated.categoria },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toVehicleResponseDto(updated);
  }

  // ---------------------------------------------------------------------
  // Revisão do Admin Rotta (Epic A — camada ADICIONAL sobre o
  // "pré-aprovado" que já existe hoje; vale pra toda empresa, de
  // qualquer tipo, inclusive Autônomo/MEI)
  // ---------------------------------------------------------------------

  /**
   * Compartilhado por `RoutesService.assertVeiculoCapacidade` (credenciar
   * numa rota — cobre também `TripsService.substituirVeiculo`, que chama
   * aquele método antes de trocar) e `TripsService.start()` (iniciar
   * viagem). Único ponto que hoje verifica `VehicleStatus`
   * `BLOQUEADO`/`INATIVO` — achado da investigação: nada checava isso
   * antes, mesmo já existindo no enum.
   */
  assertVeiculoOperavel(vehicle: {
    placa: string;
    status: VehicleStatus;
    revisaoAdminStatus: VehicleAdminReviewStatus;
  }): void {
    if (vehicle.revisaoAdminStatus === VehicleAdminReviewStatus.REPROVADO) {
      throw new BadRequestException(
        `O veículo placa ${vehicle.placa} foi reprovado pela Rotta do Brasil e não pode ser credenciado numa rota ou iniciar viagem.`,
      );
    }
    if (vehicle.status === VehicleStatus.BLOQUEADO || vehicle.status === VehicleStatus.INATIVO) {
      throw new BadRequestException(
        `O veículo placa ${vehicle.placa} está ${vehicle.status === VehicleStatus.BLOQUEADO ? "bloqueado" : "inativo"} e não pode ser credenciado numa rota ou iniciar viagem.`,
      );
    }
  }

  /**
   * `PATCH /vehicles/:id/revisao-admin` — só Admin Rotta. `status` só
   * aceita `APROVADO`/`REPROVADO` (`PRE_APROVADO` é automático, nunca uma
   * decisão manual). Motivo obrigatório só ao reprovar (mesma regra de
   * `IdentityVerificationService.decideForAdmin`). Notificação é
   * best-effort — a decisão em si nunca falha por causa dela.
   */
  async reviewVehicle(
    id: string,
    dto: ReviewVehicleDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<VehicleResponseDto> {
    if (dto.status === VehicleAdminReviewStatus.PRE_APROVADO) {
      throw new BadRequestException(
        "Só é possível aprovar ou reprovar — o estado pré-aprovado é automático.",
      );
    }
    if (
      dto.status === VehicleAdminReviewStatus.REPROVADO &&
      !dto.observacaoTransportadora?.trim()
    ) {
      throw new BadRequestException(
        "Informe o motivo da reprovação para a transportadora — ele é mostrado diretamente para ela.",
      );
    }

    const existing = await this.fetchOrThrow(id, actor);
    const updated = await this.vehicleRepository.update(id, {
      revisaoAdminStatus: dto.status,
      revisaoAdminObservacaoResponsaveis: dto.observacaoResponsaveis?.trim() || null,
      revisaoAdminObservacaoTransportadora: dto.observacaoTransportadora?.trim() || null,
      revisaoAdminDecididoPorId: actor.sub,
      revisaoAdminDecididoEm: new Date(),
    });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: "Vehicle",
      entidadeId: id,
      acao:
        dto.status === VehicleAdminReviewStatus.APROVADO
          ? "ADMIN_REVIEW_APPROVED"
          : "ADMIN_REVIEW_REJECTED",
      atorUserId: actor.sub,
      dadosAntes: { revisaoAdminStatus: existing.revisaoAdminStatus },
      dadosDepois: {
        revisaoAdminStatus: updated.revisaoAdminStatus,
        observacaoTransportadora: updated.revisaoAdminObservacaoTransportadora,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await this.notifyAdminReviewDecisionBestEffort(updated);

    return toVehicleResponseDto(updated);
  }

  /**
   * Dois destinatários, com o texto certo pra cada um (pedido explícito
   * do usuário — nunca reaproveita um texto pro outro): a transportadora
   * SEMPRE é avisada (membros `EMPRESA`/`GESTOR` da empresa dona do
   * veículo); os responsáveis das rotas ativas deste veículo só quando
   * há algo de fato pra eles saberem — reprovação sempre (muda a
   * situação do transporte do filho), aprovação só quando vem com
   * observação (senão não há nada pra "Li e concordo").
   */
  private async notifyAdminReviewDecisionBestEffort(vehicle: Vehicle): Promise<void> {
    const aprovado = vehicle.revisaoAdminStatus === VehicleAdminReviewStatus.APROVADO;
    const eventType = aprovado
      ? NotificationEventType.VEICULO_REVISAO_APROVADA
      : NotificationEventType.VEICULO_REVISAO_REPROVADA;

    try {
      const mensagemTransportadora = aprovado
        ? this.messagePersonalizationService.veiculoRevisaoAprovada(
            vehicle.placa,
            vehicle.revisaoAdminObservacaoTransportadora ?? undefined,
          )
        : this.messagePersonalizationService.veiculoRevisaoReprovada(
            vehicle.placa,
            vehicle.revisaoAdminObservacaoTransportadora ?? undefined,
          );
      const memberships = await this.usersService.listMembershipsByCompany(vehicle.companyId);
      for (const membership of memberships) {
        if ((membership.role as Role) !== Role.EMPRESA && (membership.role as Role) !== Role.GESTOR)
          continue;
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: membership.userId,
          companyId: vehicle.companyId,
          tipo: eventType,
          titulo: mensagemTransportadora.titulo,
          corpo: mensagemTransportadora.corpo,
          dadosContexto: { vehicleId: vehicle.id },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar a transportadora sobre a revisão do veículo ${vehicle.id}.`,
        error as Error,
      );
    }

    if (aprovado && !vehicle.revisaoAdminObservacaoResponsaveis?.trim()) {
      return;
    }

    try {
      const mensagemResponsaveis = aprovado
        ? this.messagePersonalizationService.veiculoRevisaoAprovada(
            vehicle.placa,
            vehicle.revisaoAdminObservacaoResponsaveis ?? undefined,
          )
        : this.messagePersonalizationService.veiculoRevisaoReprovada(
            vehicle.placa,
            vehicle.revisaoAdminObservacaoResponsaveis ?? undefined,
          );
      const responsavelIds = await this.vehicleRepository.listActiveResponsavelIds(vehicle.id);
      for (const responsavelId of responsavelIds) {
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: responsavelId,
          companyId: vehicle.companyId,
          tipo: eventType,
          titulo: mensagemResponsaveis.titulo,
          corpo: mensagemResponsaveis.corpo,
          dadosContexto: { vehicleId: vehicle.id },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar responsáveis sobre a revisão do veículo ${vehicle.id}.`,
        error as Error,
      );
    }
  }

  /**
   * `GET /vehicles/pendencias-revisao-admin` (Responsável) — mesmo
   * cálculo de diff de `UsersService.getPendingConsents`: um veículo só
   * aparece aqui se a decisão mais recente (`revisaoAdminDecididoEm`)
   * ainda não tem um `VehicleAdminReviewAcknowledgement` correspondente
   * deste responsável. Aprovação sem observação nunca aparece — não há
   * nada pra "Li e concordo" confirmar.
   */
  async listPendingAdminReviewAcknowledgements(
    actor: AuthenticatedUser,
  ): Promise<VehicleAdminReviewPendingDto[]> {
    const vehicles = await this.vehicleRepository.listVehiclesForResponsavel(actor.sub);
    const pending: VehicleAdminReviewPendingDto[] = [];

    for (const vehicle of vehicles) {
      if (!vehicle.revisaoAdminDecididoEm) continue;
      const reprovado = vehicle.revisaoAdminStatus === VehicleAdminReviewStatus.REPROVADO;
      const temObservacao = Boolean(vehicle.revisaoAdminObservacaoResponsaveis?.trim());
      if (!reprovado && !temObservacao) continue;

      const jaReconhecido = await this.vehicleRepository.existsAdminReviewAcknowledgement(
        vehicle.id,
        actor.sub,
        vehicle.revisaoAdminDecididoEm,
      );
      if (jaReconhecido) continue;

      pending.push({
        vehicleId: vehicle.id,
        placa: vehicle.placa,
        status: vehicle.revisaoAdminStatus,
        observacao: vehicle.revisaoAdminObservacaoResponsaveis,
        decisaoEm: vehicle.revisaoAdminDecididoEm,
      });
    }

    return pending;
  }

  /**
   * `POST /vehicles/:id/revisao-admin/reconhecer` — só "Li e concordo",
   * de propósito NUNCA existe "recusar" aqui (pedido explícito do
   * usuário). Append-only (mesmo desenho de `ConsentRecord`) — grava com
   * o `revisaoAdminDecididoEm` ATUAL do veículo, então uma decisão nova
   * no futuro (mesmo reaprovando) sempre pede reconhecimento de novo.
   */
  async acknowledgeAdminReview(id: string, actor: AuthenticatedUser): Promise<void> {
    // Reaproveita `listVehiclesForResponsavel` (em vez de `findById`, que
    // é tenant-scoped e este responsável não pertence ao tenant do
    // veículo) — como bônus, já garante que o responsável só reconhece
    // veículos de rotas onde ele de fato tem um aluno ativo.
    const vehicles = await this.vehicleRepository.listVehiclesForResponsavel(actor.sub);
    const vehicle = vehicles.find((candidate) => candidate.id === id);
    if (!vehicle || !vehicle.revisaoAdminDecididoEm) {
      throw new NotFoundException(
        "Este veículo não tem nenhuma decisão do Admin Rotta pendente para você.",
      );
    }
    await this.vehicleRepository.createAdminReviewAcknowledgement(
      id,
      actor.sub,
      vehicle.revisaoAdminDecididoEm,
    );
  }
}
