import { randomUUID } from "node:crypto";

import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DriverDocumentType, type DriverDocumentAiStatus } from "@prisma/client";


import { DRIVER_DOCUMENT_REPOSITORY } from "./drivers.constants";
import { toDriverDocumentResponseDto } from "./mappers/driver-document.mapper";

import type { CreateDriverDocumentDto } from "./dto/create-driver-document.dto";
import type { DriverDocumentResponseDto } from "./dto/driver-document-response.dto";
import type { DriverDocumentRepository } from "./repositories/driver-document.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";
import type { RottaAiCheckType } from "@/modules/rotta-ai/dto/validate-document.dto";

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
 * `DriverDocumentType` que a Rotta AI sabe checar hoje (Dossiê 28/
 * `RottaAiService.validateDocument`) — CNH é real (Didit); EAR/CURSO
 * são stub honesto (`NotImplementedException`). `ANTECEDENTES_CRIMINAIS`
 * e `OUTRO` não têm check correspondente ainda — mesmo tratamento de
 * `VehicleDocumentType.OUTRO` em `VehiclesService`: análise pulada, o
 * upload nunca fica bloqueado esperando por um provedor que não existe
 * pra aquele tipo.
 */
const DRIVER_DOCUMENT_TYPE_TO_AI_CHECK: Partial<Record<DriverDocumentType, RottaAiCheckType>> = {
  CNH: "CNH",
  EAR: "EAR",
  CURSO_TRANSPORTE_ESCOLAR: "CURSO",
};

/**
 * Núcleo de negócio do módulo Drivers (Dossiê 28 — CNH/EAR/Cursos
 * obrigatórios). Mesmo padrão de `VehiclesService`: Repository Pattern,
 * upload delegado a `SupabaseStorageService`, auditoria sempre
 * best-effort, análise de documento delegada a `RottaAiService`
 * (`validateDocument`, reaproveitado — não duplicado — do check de
 * identidade já usado no cadastro do motorista).
 *
 * Escopo desta entrega é só o documento de habilitação/qualificação
 * (`DriverDocument`) — cadastro/disponibilidade/status derivado do
 * motorista continuam fora, sem pedido concreto ainda que os
 * justifique (ver `drivers.module.ts`).
 */
@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @Inject(DRIVER_DOCUMENT_REPOSITORY)
    private readonly documentRepository: DriverDocumentRepository,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly storageService: SupabaseStorageService,
    private readonly rottaAiService: RottaAiService,
  ) {}

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  /**
   * Resolve em qual tenant esta operação acontece e valida que `actor`
   * pode agir sobre os documentos de `targetUserId`:
   * - `MOTORISTA`/`MONITOR`: só os PRÓPRIOS documentos.
   * - `EMPRESA`/`GESTOR`: documentos de qualquer motorista/monitor com
   *   `Membership` ATIVO na própria empresa (mesma checagem de
   *   `VehiclesService.assign`, via `UsersService.findActiveMembership`).
   * - `ADMIN_ROTTA`: qualquer motorista, desde que informe `companyId`
   *   explicitamente (não tem tenant próprio no JWT).
   *
   * `NotFoundException` em vez de `ForbiddenException` — mesmo
   * princípio de não-enumeração de `VehiclesService.assertCanAccessVehicle`.
   */
  private async resolveCompanyContext(
    targetUserId: string,
    actor: AuthenticatedUser,
    companyIdOverride?: string,
  ): Promise<string> {
    if (actor.role === Role.ADMIN_ROTTA) {
      if (!companyIdOverride) {
        throw new BadRequestException(
          "Admin Rotta precisa informar companyId para acessar documentos de um motorista.",
        );
      }
      return companyIdOverride;
    }

    if (!actor.tenantId) {
      throw new NotFoundException("Motorista não encontrado.");
    }

    if (targetUserId === actor.sub) {
      return actor.tenantId;
    }

    if (actor.role === Role.MOTORISTA || actor.role === Role.MONITOR) {
      // Só o próprio motorista/monitor acessa os próprios documentos.
      throw new NotFoundException("Motorista não encontrado.");
    }

    const membership = await this.usersService.findActiveMembership(targetUserId, actor.tenantId);
    const membershipRole = membership?.role as Role | undefined;
    if (!membership || (membershipRole !== Role.MOTORISTA && membershipRole !== Role.MONITOR)) {
      throw new NotFoundException("Motorista não encontrado nesta empresa.");
    }

    return actor.tenantId;
  }

  /** Auditoria é sempre best-effort — mesma justificativa de `VehiclesService.recordAudit`. */
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

  // ---------------------------------------------------------------------
  // Documentos (Dossiê 28 — CNH/EAR/Cursos obrigatórios)
  // ---------------------------------------------------------------------

  async uploadDocument(
    targetUserId: string,
    dto: CreateDriverDocumentDto,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    companyIdOverride?: string,
  ): Promise<DriverDocumentResponseDto> {
    const companyId = await this.resolveCompanyContext(targetUserId, actor, companyIdOverride);

    const isPdf = file.mimetype === "application/pdf";
    const isImage = file.mimetype.startsWith("image/");
    if (!isPdf && !isImage) {
      throw new BadRequestException("O documento precisa ser um PDF ou uma imagem.");
    }

    const extension = file.originalname.split(".").pop() ?? (isPdf ? "pdf" : "jpg");
    // uploadPrivate (Dossiê 32): documento pessoal (CNH/EAR/Cursos) — nunca
    // exposto por URL pública previsível, só por URL assinada.
    const url = await this.storageService.uploadPrivate(
      `drivers/${targetUserId}/documents/${randomUUID()}.${extension}`,
      file.buffer,
      file.mimetype,
    );

    let document = await this.documentRepository.create({
      userId: targetUserId,
      companyId,
      tipo: dto.tipo,
      numero: dto.numero,
      categoria: dto.categoria,
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
      fileUrl: url,
      vencimentoEm: dto.vencimentoEm ? new Date(dto.vencimentoEm) : undefined,
      uploadedByUserId: actor.sub,
    });

    await this.recordAudit({
      companyId,
      entidadeTipo: "DriverDocument",
      entidadeId: document.id,
      acao: "DRIVER_DOCUMENT_UPLOADED",
      atorUserId: actor.sub,
      dadosDepois: { userId: targetUserId, tipo: document.tipo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    document = await this.analyzeDocumentWithRottaAi(document.id, document.tipo, url);

    return toDriverDocumentResponseDto(document);
  }

  /**
   * Best-effort, nunca bloqueia o upload — mesmo padrão de
   * `VehiclesService.analyzeDocumentWithRottaAi`. Reaproveita
   * `RottaAiService.validateDocument` (já usado no cadastro de
   * identidade do motorista) em vez de duplicar um método novo —
   * `documentoTitularRole: Role.MOTORISTA` é sempre passado porque só
   * motoristas têm `DriverDocument` do tipo CNH neste módulo hoje
   * (monitores não dirigem, `Dossiê 13`).
   */
  private async analyzeDocumentWithRottaAi(
    documentId: string,
    tipo: DriverDocumentType,
    fileUrl: string,
  ) {
    const checkType = DRIVER_DOCUMENT_TYPE_TO_AI_CHECK[tipo];
    if (!checkType) {
      return this.documentRepository.findById(documentId).then((doc) => doc!);
    }

    try {
      const resultado = await this.rottaAiService.validateDocument(
        { tipo: checkType, referenciaArquivo: fileUrl },
        Role.MOTORISTA,
      );
      const status: DriverDocumentAiStatus = resultado.aprovado ? "APROVADO" : "REPROVADO";
      return this.documentRepository.updateAiResult(documentId, {
        rottaAiStatus: status,
        rottaAiAnalisadoEm: new Date(),
        rottaAiObservacoes: `Verificação via ${resultado.provedor} — status bruto: ${resultado.status}.`,
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
          "Integração com provedor de verificação de identidade/documentos ainda não disponível para este tipo.",
      });
    }
  }

  async listDocuments(
    targetUserId: string,
    actor: AuthenticatedUser,
    tipo: DriverDocumentType | undefined,
    companyIdOverride: string | undefined,
  ): Promise<DriverDocumentResponseDto[]> {
    await this.resolveCompanyContext(targetUserId, actor, companyIdOverride);
    const documents = await this.documentRepository.listByUser({ userId: targetUserId, tipo });
    return documents.map(toDriverDocumentResponseDto);
  }

  async removeDocument(
    targetUserId: string,
    documentId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    companyIdOverride?: string,
  ): Promise<void> {
    const companyId = await this.resolveCompanyContext(targetUserId, actor, companyIdOverride);
    const document = await this.documentRepository.findById(documentId);
    if (!document || document.userId !== targetUserId) {
      throw new NotFoundException("Documento não encontrado.");
    }

    await this.documentRepository.softDelete(documentId);

    await this.recordAudit({
      companyId,
      entidadeTipo: "DriverDocument",
      entidadeId: documentId,
      acao: "DRIVER_DOCUMENT_REMOVED",
      atorUserId: actor.sub,
      dadosAntes: { userId: targetUserId, tipo: document.tipo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }
}
