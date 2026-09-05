import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY } from "./company-join-pre-registrations.constants";
import { toCompanyJoinPreRegistrationResponseDto } from "./mappers/company-join-pre-registration.mapper";

import type {
  CompanyJoinPreRegistrationResponseDto,
  ListCompanyJoinPreRegistrationsResponseDto,
} from "./dto/company-join-pre-registration-response.dto";
import type { CreateCompanyJoinPreRegistrationDto } from "./dto/create-company-join-pre-registration.dto";
import type { CompanyJoinPreRegistrationRepository } from "./repositories/company-join-pre-registration.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";

import { AuditLogService } from "@/modules/audit/audit-log.service";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * "Convites" (pedido do usuário 02/09/2026, ver nota completa em
 * `CompanyJoinPreRegistration`, schema.prisma) — só o lado da Empresa/
 * Gestor (criar/listar/cancelar um pré-cadastro). O outro lado (bater o
 * pré-cadastro contra quem informa o código e liberar o `Membership` na
 * hora) mora em `CompanyJoinRequestsService.create`, que injeta o
 * `COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY` diretamente — mesmo padrão
 * de `CompanyJoinRequestsService` já injetar `COMPANY_REPOSITORY` sem
 * passar por um Service intermediário.
 */
@Injectable()
export class CompanyJoinPreRegistrationsService {
  private readonly logger = new Logger(CompanyJoinPreRegistrationsService.name);

  constructor(
    @Inject(COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY)
    private readonly repository: CompanyJoinPreRegistrationRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    actor: AuthenticatedUser,
    dto: CreateCompanyJoinPreRegistrationDto,
  ): Promise<CompanyJoinPreRegistrationResponseDto> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }

    const nome = dto.nome?.trim() || null;
    const celular = dto.celular ? onlyDigits(dto.celular) : null;
    if (!nome && !celular) {
      throw new BadRequestException("Informe ao menos o nome ou o celular da pessoa.");
    }

    const created = await this.repository.create({
      companyId: actor.tenantId,
      criadoPorId: actor.sub,
      role: dto.role,
      nome,
      celular,
    });

    await this.recordAudit({
      companyId: actor.tenantId,
      entidadeTipo: "CompanyJoinPreRegistration",
      entidadeId: created.id,
      acao: "JOIN_PRE_REGISTRATION_CRIADO",
      atorUserId: actor.sub,
      dadosDepois: { role: created.role, nome: created.nome, celular: created.celular },
    });

    return toCompanyJoinPreRegistrationResponseDto(created);
  }

  async listByCompany(
    actor: AuthenticatedUser,
  ): Promise<ListCompanyJoinPreRegistrationsResponseDto> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }
    const items = await this.repository.listByCompany(actor.tenantId);
    return { items: items.map(toCompanyJoinPreRegistrationResponseDto) };
  }

  async cancel(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<CompanyJoinPreRegistrationResponseDto> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }
    // RLS (`withTenant`) já restringe `findById` à própria empresa do
    // ator — mesma não-enumeração de `CompanyJoinRequestsService`.
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Pré-cadastro não encontrado.");
    }
    if (existing.status !== "PENDENTE") {
      throw new BadRequestException(
        "Este pré-cadastro já foi vinculado ou cancelado, não é possível cancelar de novo.",
      );
    }

    const cancelled = await this.repository.cancel(id);

    await this.recordAudit({
      companyId: actor.tenantId,
      entidadeTipo: "CompanyJoinPreRegistration",
      entidadeId: id,
      acao: "JOIN_PRE_REGISTRATION_CANCELADO",
      atorUserId: actor.sub,
    });

    return toCompanyJoinPreRegistrationResponseDto(cancelled);
  }

  /** Best-effort (mesmo espírito de `CompanyJoinRequestsService.recordAudit`) — nunca reverte a operação já concluída. */
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
}
