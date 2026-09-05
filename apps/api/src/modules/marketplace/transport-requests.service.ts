import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { toTransportRequestResponseDto } from "./mappers/transport-request.mapper";
import { TRANSPORTER_REPOSITORY, TRANSPORT_REQUEST_REPOSITORY } from "./marketplace.constants";

import type { CreateTransportRequestDto } from "./dto/create-transport-request.dto";
import type { ListTransportRequestsQueryDto } from "./dto/list-transport-requests-query.dto";
import type { RecusarTransportRequestDto } from "./dto/recusar-transport-request.dto";
import type {
  ListTransportRequestsResponseDto,
  TransportRequestResponseDto,
} from "./dto/transport-request-response.dto";
import type {
  TransportRequestAccessScope,
  TransportRequestRepository,
} from "./repositories/transport-request.repository";
import type { TransporterRepository } from "./repositories/transporter.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { TransportRequest } from "@prisma/client";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { StudentsService } from "@/modules/students/students.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const ENTIDADE_TIPO = "TransportRequest";

/**
 * Fluxo de solicitação de transporte (briefing "Marketplace"
 * §"SOLICITAR TRANSPORTE"/"SOLICITAÇÃO"). Criação é sempre do
 * Responsável (dono do aluno); transições de status
 * (`em-analise`/`aprovar`/`recusar`) são sempre da Empresa/Gestor dona
 * da solicitação — nunca o inverso, e nunca o próprio Responsável muda
 * o status da sua solicitação.
 */
@Injectable()
export class TransportRequestsService {
  private readonly logger = new Logger(TransportRequestsService.name);

  constructor(
    @Inject(TRANSPORT_REQUEST_REPOSITORY)
    private readonly transportRequestRepository: TransportRequestRepository,
    @Inject(TRANSPORTER_REPOSITORY) private readonly transporterRepository: TransporterRepository,
    private readonly studentsService: StudentsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async recordAudit(input: {
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.record({ ...input, entidadeTipo: ENTIDADE_TIPO });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (TransportRequest ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  private scopeForActor(actor: AuthenticatedUser): TransportRequestAccessScope {
    if (actor.role === Role.RESPONSAVEL) return { responsavelId: actor.sub };
    if (actor.role === Role.EMPRESA || actor.role === Role.GESTOR) {
      return { companyId: actor.tenantId ?? undefined };
    }
    return {}; // ADMIN_ROTTA — sem restrição adicional
  }

  private async fetchOrThrow(id: string, actor: AuthenticatedUser): Promise<TransportRequest> {
    const scope = this.scopeForActor(actor);
    const found =
      actor.role === Role.ADMIN_ROTTA
        ? await this.transportRequestRepository.findById(id)
        : await this.transportRequestRepository.findByIdScoped(id, scope);
    if (!found) {
      throw new NotFoundException("Solicitação de transporte não encontrada.");
    }
    return found;
  }

  async create(
    dto: CreateTransportRequestDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TransportRequestResponseDto> {
    if (Boolean(dto.studentId) === Boolean(dto.novoAluno)) {
      throw new BadRequestException(
        "Informe exatamente um dos dois: `studentId` (aluno já cadastrado) ou `novoAluno` (cadastro inline).",
      );
    }

    const company = await this.transporterRepository.findCandidateById(dto.companyId);
    if (!company) {
      throw new NotFoundException("Transportador não encontrado.");
    }

    const student = dto.studentId
      ? await this.studentsService.findByIdOrThrow(dto.studentId, actor)
      : await this.studentsService.create(dto.novoAluno!, actor, meta);

    const existingOpen = await this.transportRequestRepository.findOpenByStudentAndCompany(
      student.id,
      dto.companyId,
    );
    if (existingOpen) {
      throw new ConflictException(
        "Já existe uma solicitação em aberto deste aluno para este transportador.",
      );
    }

    const transportRequest = await this.transportRequestRepository.create({
      studentId: student.id,
      responsavelId: actor.sub,
      companyId: dto.companyId,
      schoolId: student.schoolId,
      turno: student.turno,
    });

    await this.recordAudit({
      entidadeId: transportRequest.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { studentId: student.id, companyId: dto.companyId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toTransportRequestResponseDto(transportRequest);
  }

  async list(
    query: ListTransportRequestsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListTransportRequestsResponseDto> {
    const scope = this.scopeForActor(actor);
    const result = await this.transportRequestRepository.list({
      ...scope,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.items.map(toTransportRequestResponseDto),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findByIdOrThrow(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<TransportRequestResponseDto> {
    const found = await this.fetchOrThrow(id, actor);
    return toTransportRequestResponseDto(found);
  }

  private assertEmpresaCanTransition(transportRequest: TransportRequest): void {
    if (transportRequest.status === "APROVADA" || transportRequest.status === "RECUSADA") {
      throw new ForbiddenException("Esta solicitação já foi encerrada e não pode mudar de status.");
    }
  }

  async marcarEmAnalise(
    id: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TransportRequestResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    this.assertEmpresaCanTransition(existing);
    if (existing.status !== "RECEBIDA") {
      throw new ForbiddenException("Só uma solicitação Recebida pode entrar Em análise.");
    }

    const updated = await this.transportRequestRepository.updateStatus(id, {
      status: "EM_ANALISE",
    });
    await this.recordAudit({
      entidadeId: id,
      acao: "EM_ANALISE",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return toTransportRequestResponseDto(updated);
  }

  async aprovar(
    id: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TransportRequestResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    this.assertEmpresaCanTransition(existing);

    const updated = await this.transportRequestRepository.updateStatus(id, {
      status: "APROVADA",
      motivoRecusa: null,
    });
    await this.recordAudit({
      entidadeId: id,
      acao: "APROVADA",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return toTransportRequestResponseDto(updated);
  }

  async recusar(
    id: string,
    dto: RecusarTransportRequestDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TransportRequestResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    this.assertEmpresaCanTransition(existing);

    const updated = await this.transportRequestRepository.updateStatus(id, {
      status: "RECUSADA",
      motivoRecusa: dto.motivoRecusa,
    });
    await this.recordAudit({
      entidadeId: id,
      acao: "RECUSADA",
      atorUserId: actor.sub,
      dadosDepois: { motivoRecusa: dto.motivoRecusa },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return toTransportRequestResponseDto(updated);
  }
}
