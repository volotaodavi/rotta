import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationEventType } from "@prisma/client";


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
import { CompaniesService } from "@/modules/companies/companies.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { RottaAiService } from "@/modules/rotta-ai/rotta-ai.service";
import { WalletService } from "@/modules/wallet/wallet.service";
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
 * respectivo ator. Assim que a SEGUNDA assinatura chega (de qualquer um
 * dos dois lados), `tryActivateAfterBothSigned` ativa o transporte
 * automaticamente (briefing "ROTTA AI" pós-assinatura) — a ativação em
 * si é uma regra de negócio determinística ("as duas assinaturas já
 * estão no banco"), nunca condicionada ao resultado da Rotta AI: esta é
 * chamada apenas como uma checagem adicional best-effort (mesmo padrão
 * de `analyzeVehicleDocument`, nunca bloqueante), então segue
 * indisponível hoje sem impedir a ativação.
 */
@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
    @Inject(TRANSPORT_REQUEST_REPOSITORY)
    private readonly transportRequestRepository: TransportRequestRepository,
    private readonly authentiqueService: AuthentiqueService,
    private readonly rottaAiService: RottaAiService,
    private readonly auditLogService: AuditLogService,
    private readonly companiesService: CompaniesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly walletService: WalletService,
  ) {}

  /** Best-effort — nunca bloqueia a emissão do evento de comunicação por causa de uma falha ao resolver `nomeFantasia`. */
  private async resolveNomeEmpresa(companyId: string): Promise<string> {
    try {
      return (await this.companiesService.getNomeFantasia(companyId)) ?? "a transportadora";
    } catch (error) {
      this.logger.warn(`Falha ao resolver nomeFantasia da empresa ${companyId} para notificação.`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
      return "a transportadora";
    }
  }

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

    const nomeEmpresa = await this.resolveNomeEmpresa(contract.companyId);
    const { titulo, corpo } = this.messagePersonalizationService.novoContrato(nomeEmpresa);
    this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
      userId: contract.responsavelId,
      companyId: contract.companyId,
      tipo: NotificationEventType.NOVO_CONTRATO,
      titulo,
      corpo,
      dadosContexto: { contractId: contract.id },
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

  /**
   * Mesma checagem de `findByIdOrThrow`, mas devolve o `Contract` bruto
   * (não o DTO) — para consumo por OUTROS módulos que precisam dos
   * campos internos (`studentId`, `motoristaId`, `vehicleId`, `status`),
   * como `RoutesService.addStudent` (RN-26 exige saber a que contrato
   * ATIVO um aluno pertence antes de vinculá-lo a uma rota). Mesmo
   * padrão de `VehiclesService.countActive`: um método público que
   * expõe o domínio, nunca o repositório diretamente.
   */
  async findRawByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<Contract> {
    return this.fetchOrThrow(id, actor);
  }

  /**
   * Chamada logo após CADA assinatura — só ativa quando as duas já
   * estão presentes (a que acabou de ser gravada + a que já existia).
   * `RottaAiService.validarContratoAssinado` é best-effort e nunca
   * impede a ativação (ver nota da classe).
   */
  private async tryActivateAfterBothSigned(
    contract: Contract,
    atorUserId: string,
    meta: RequestMeta,
  ): Promise<Contract> {
    if (!contract.assinadoResponsavelEm || !contract.assinadoEmpresaEm) {
      return contract;
    }

    try {
      await this.rottaAiService.validarContratoAssinado({ contractId: contract.id });
    } catch (error) {
      this.logger.warn(
        `Rotta AI indisponível para validar o contrato ${contract.id} — ativação segue apenas pela regra de negócio (ambas as assinaturas já presentes).`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }

    const activated = await this.contractRepository.activate(contract.id);
    await this.recordAudit({
      entidadeId: contract.id,
      acao: "ATIVADO",
      atorUserId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // Best-effort, nunca bloqueia a ativação (Dossiê 26, Seção 6) — o
    // crédito nasce PENDENTE (a receber, não sacável) até alguém
    // confirmar o recebimento de verdade; ver `WalletService.registrarMensalidadePendente`.
    await this.walletService.registrarMensalidadePendente(activated);

    const nomeEmpresa = await this.resolveNomeEmpresa(activated.companyId);
    const { titulo, corpo } = this.messagePersonalizationService.contratoAssinado(nomeEmpresa);
    this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
      userId: activated.responsavelId,
      companyId: activated.companyId,
      tipo: NotificationEventType.CONTRATO_ASSINADO,
      titulo,
      corpo,
      dadosContexto: { contractId: activated.id },
    });

    return activated;
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

    const final = await this.tryActivateAfterBothSigned(updated, actor.sub, meta);
    return toContractResponseDto(final);
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

    const final = await this.tryActivateAfterBothSigned(updated, actor.sub, meta);
    return toContractResponseDto(final);
  }
}
