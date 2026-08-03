import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";


import { toRatingResponseDto } from "./mappers/rating.mapper";
import { CONTRACT_REPOSITORY, RATING_REPOSITORY } from "./marketplace.constants";

import type { CreateRatingDto } from "./dto/create-rating.dto";
import type { RatingResponseDto } from "./dto/rating-response.dto";
import type { ContractRepository } from "./repositories/contract.repository";
import type { RatingAccessScope, RatingRepository } from "./repositories/rating.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { Contract, RatingTargetType } from "@prisma/client";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const ENTIDADE_TIPO = "Rating";
const DIAS_MINIMOS_APOS_ATIVACAO = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Avaliações pós-transporte (briefing "Marketplace" §"AVALIAÇÕES") —
 * sempre do Responsável dono do contrato, liberadas somente 30 dias
 * após a ativação (briefing: "Após 30 dias de uso... o Responsável
 * pode avaliar"). `alvoId` é sempre resolvido aqui a partir do próprio
 * `Contract` (nunca aceito do cliente — ver nota em `CreateRatingDto`).
 */
@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratingRepository: RatingRepository,
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async recordAudit(input: {
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosDepois?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.record({ ...input, entidadeTipo: ENTIDADE_TIPO });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (Rating ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  private resolveAlvoId(contract: Contract, alvoTipo: RatingTargetType): string {
    const alvoIdPorTipo: Record<RatingTargetType, string | null> = {
      EMPRESA: contract.companyId,
      MOTORISTA: contract.motoristaId,
      MONITOR: contract.monitorId,
      VEICULO: contract.vehicleId,
    };
    const alvoId = alvoIdPorTipo[alvoTipo];
    if (!alvoId) {
      throw new ForbiddenException(
        `Este contrato não tem ${alvoTipo.toLowerCase()} atribuído para avaliar.`,
      );
    }
    return alvoId;
  }

  async create(
    contractId: string,
    dto: CreateRatingDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<RatingResponseDto> {
    const contract = await this.contractRepository.findByIdScoped(contractId, {
      responsavelId: actor.sub,
    });
    if (!contract) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    if (!contract.ativadoEm) {
      throw new ForbiddenException("Este contrato ainda não foi ativado.");
    }
    const diasDesdeAtivacao = (Date.now() - contract.ativadoEm.getTime()) / MS_POR_DIA;
    if (diasDesdeAtivacao < DIAS_MINIMOS_APOS_ATIVACAO) {
      throw new ForbiddenException(
        `A avaliação só fica disponível ${DIAS_MINIMOS_APOS_ATIVACAO} dias após a ativação do transporte.`,
      );
    }

    const alvoId = this.resolveAlvoId(contract, dto.alvoTipo);

    const existing = await this.ratingRepository.findByContractResponsavelAlvo(
      contractId,
      actor.sub,
      dto.alvoTipo,
    );
    if (existing) {
      throw new ConflictException(`Você já avaliou ${dto.alvoTipo.toLowerCase()} neste contrato.`);
    }

    const rating = await this.ratingRepository.create({
      contractId,
      responsavelId: actor.sub,
      companyId: contract.companyId,
      alvoTipo: dto.alvoTipo,
      alvoId,
      nota: dto.nota,
      comentario: dto.comentario,
    });

    await this.recordAudit({
      entidadeId: rating.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { contractId, alvoTipo: dto.alvoTipo, nota: dto.nota },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toRatingResponseDto(rating);
  }

  async listByContract(contractId: string, actor: AuthenticatedUser): Promise<RatingResponseDto[]> {
    const scope: RatingAccessScope =
      actor.role === Role.RESPONSAVEL
        ? { responsavelId: actor.sub }
        : actor.role === Role.EMPRESA || actor.role === Role.GESTOR
          ? { companyId: actor.tenantId ?? undefined }
          : {};

    const contract =
      actor.role === Role.ADMIN_ROTTA
        ? await this.contractRepository.findById(contractId)
        : await this.contractRepository.findByIdScoped(contractId, scope);
    if (!contract) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    const ratings = await this.ratingRepository.listByContract(contractId, scope);
    return ratings.map(toRatingResponseDto);
  }
}
