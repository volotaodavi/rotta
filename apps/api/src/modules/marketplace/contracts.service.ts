import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";


import { toContractResponseDto } from "./mappers/contract.mapper";
import { CONTRACT_REPOSITORY, TRANSPORT_REQUEST_REPOSITORY } from "./marketplace.constants";

import type { ContractResponseDto, ListContractsResponseDto } from "./dto/contract-response.dto";
import type { CreateContractDto } from "./dto/create-contract.dto";
import type { ListContractsQueryDto } from "./dto/list-contracts-query.dto";
import type { ContractAccessScope, ContractRepository } from "./repositories/contract.repository";
import type { TransportRequestRepository } from "./repositories/transport-request.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { Contract } from "@prisma/client";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { AuthentiqueService } from "@/modules/authentique/authentique.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const ENTIDADE_TIPO = "Contract";

/**
 * Geração/assinatura de contrato (briefing "Marketplace" §"CONTRATO").
 * Geração é sempre da Empresa/Gestor dona da `TransportRequest`
 * `APROVADA`; a assinatura tem DOIS lados independentes
 * (`assinarComoResponsavel`/`assinarComoEmpresa`), cada um só pelo
 * respectivo ator. Ativação automática pós-assinatura (Rotta AI) é
 * responsabilidade de outro serviço (briefing "ROTTA AI" pós-assinatura)
 * — deliberadamente fora daqui, para manter este service focado só na
 * geração/assinatura em si.
 */
@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
    @Inject(TRANSPORT_REQUEST_REPOSITORY)
    private readonly transportRequestRepository: TransportRequestRepository,
    private readonly authentiqueService: AuthentiqueService,
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
        `Falha ao registrar auditoria (Contract ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  private scopeForActor(actor: AuthenticatedUser): ContractAccessScope {
    if (actor.role === Role.RESPONSAVEL) return { responsavelId: actor.sub };
    if (actor.role === Role.EMPRESA || actor.role === Role.GESTOR) {
      return { companyId: actor.tenantId ?? undefined };
    }
    return {};
  }

  private async fetchOrThrow(id: string, actor: AuthenticatedUser): Promise<Contract> {
    const scope = this.scopeForActor(actor);
    const found =
      actor.role === Role.ADMIN_ROTTA
        ? await this.contractRepository.findById(id)
        : await this.contractRepository.findByIdScoped(id, scope);
    if (!found) {
      throw new NotFoundException("Contrato não encontrado.");
    }
    return found;
  }

  async gerarContrato(
    transportRequestId: string,
    dto: CreateContractDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<ContractResponseDto> {
    const transportRequest = await this.transportRequestRepository.findByIdScoped(
      transportRequestId,
      { companyId: actor.tenantId ?? undefined },
    );
    if (!transportRequest) {
      throw new NotFoundException("Solicitação de transporte não encontrada.");
    }
    if (transportRequest.status !== "APROVADA") {
      throw new ForbiddenException("Só é possível gerar contrato para uma solicitação Aprovada.");
    }

    const existing = await this.contractRepository.findByTransportRequestId(transportRequestId);
    if (existing) {
      throw new ConflictException("Esta solicitação já tem um contrato gerado.");
    }

    const contract = await this.contractRepository.create({
      transportRequestId,
      studentId: transportRequest.studentId,
      responsavelId: transportRequest.responsavelId,
      companyId: transportRequest.companyId,
      schoolId: transportRequest.schoolId,
      valorMensalidadeCentavos: dto.valorMensalidadeCentavos,
      planoDescricao: dto.planoDescricao,
      regras: dto.regras,
      vigenciaInicio: new Date(dto.vigenciaInicio),
      vigenciaFim: dto.vigenciaFim ? new Date(dto.vigenciaFim) : undefined,
      vehicleId: dto.vehicleId,
      motoristaId: dto.motoristaId,
      monitorId: dto.monitorId,
    });

    try {
      await this.authentiqueService.prepararDocumentoParaAssinatura({ contractId: contract.id });
    } catch (error) {
      this.logger.warn(
        `Authentique indisponível para o contrato ${contract.id} — assinatura seguirá pendente.`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }

    await this.recordAudit({
      entidadeId: contract.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { transportRequestId, valorMensalidadeCentavos: dto.valorMensalidadeCentavos },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toContractResponseDto(contract);
  }

  async list(
    query: ListContractsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListContractsResponseDto> {
    const scope = this.scopeForActor(actor);
    const result = await this.contractRepository.list({
      ...scope,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.items.map(toContractResponseDto),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<ContractResponseDto> {
    const found = await this.fetchOrThrow(id, actor);
    return toContractResponseDto(found);
  }

  async assinarComoResponsavel(
    id: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<ContractResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    if (existing.status !== "AGUARDANDO_ASSINATURA") {
      throw new ForbiddenException("Este contrato não está aguardando assinatura.");
    }
    if (existing.assinadoResponsavelEm) {
      throw new ConflictException("Você já assinou este contrato.");
    }

    const updated = await this.contractRepository.updateAsResponsavel(id, {
      assinadoResponsavelEm: new Date(),
    });
    await this.recordAudit({
      entidadeId: id,
      acao: "ASSINADO_RESPONSAVEL",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return toContractResponseDto(updated);
  }

  async assinarComoEmpresa(
    id: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<ContractResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    if (existing.status !== "AGUARDANDO_ASSINATURA") {
      throw new ForbiddenException("Este contrato não está aguardando assinatura.");
    }
    if (existing.assinadoEmpresaEm) {
      throw new ConflictException("A empresa já assinou este contrato.");
    }

    const updated = await this.contractRepository.updateAsEmpresa(id, {
      assinadoEmpresaEm: new Date(),
    });
    await this.recordAudit({
      entidadeId: id,
      acao: "ASSINADO_EMPRESA",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return toContractResponseDto(updated);
  }
}
