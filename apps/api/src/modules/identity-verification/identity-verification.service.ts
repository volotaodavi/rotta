import { BadRequestException, Injectable } from "@nestjs/common";
import { type IdentityVerificationStatus, Prisma } from "@prisma/client";

import type { DecideIdentityVerificationDto } from "./dto/decide-identity-verification.dto";
import type { ListIdentityVerificationsQueryDto } from "./dto/list-identity-verifications-query.dto";

import { PrismaService } from "@/infra/database/prisma.service";
import {
  DEFAULT_REJECTION_REASON,
  extractDiditDecisionReason,
  mapDiditStatus,
} from "@/infra/didit/didit-decision.util";
import { DiditService } from "@/infra/didit/didit.service";


export interface IdentityVerificationSessionResult {
  url: string;
  sessionId: string;
}

export interface IdentityVerificationStatusResult {
  status: IdentityVerificationStatus;
  verifiedAt: Date | null;
  /** Motivo legível da última decisão — só populado quando a Didit (ou o Admin Rotta) de fato informou um; visível pro usuário quando `status === "REPROVADA"`. */
  motivo: string | null;
}

/** Linha da listagem `GET /identity-verification/admin` — um resumo por usuário, sem o payload bruto (que só entra no detalhe). */
export interface AdminIdentityVerificationListItem {
  userId: string;
  nome: string;
  email: string;
  companyName: string | null;
  status: IdentityVerificationStatus;
  sessionId: string | null;
  motivo: string | null;
  verifiedAt: Date | null;
  updatedAt: Date;
}

export interface AdminIdentityVerificationListResult {
  items: AdminIdentityVerificationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Detalhe `GET /identity-verification/admin/:userId` — a listagem mais o payload bruto da última decisão, pra quando o admin precisar inspecionar o que a Didit de fato mandou. */
export interface AdminIdentityVerificationDetail extends AdminIdentityVerificationListItem {
  decisao: Prisma.JsonValue | null;
}

/** Seleção Prisma compartilhada por `listForAdmin`/`getForAdmin` — mantém as duas em sincronia sem duplicar a lista de campos. */
const ADMIN_SELECT = {
  id: true,
  nome: true,
  email: true,
  identityVerificationStatus: true,
  identityVerificationSessionId: true,
  identityVerificationMotivo: true,
  identityVerifiedAt: true,
  updatedAt: true,
  memberships: {
    take: 1,
    orderBy: { iniciadoEm: "desc" as const },
    select: { company: { select: { nomeFantasia: true } } },
  },
} satisfies Prisma.UserSelect;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof ADMIN_SELECT }>;

function toListItem(user: AdminUserRow): AdminIdentityVerificationListItem {
  return {
    userId: user.id,
    nome: user.nome,
    email: user.email,
    companyName: user.memberships[0]?.company.nomeFantasia ?? null,
    status: user.identityVerificationStatus,
    sessionId: user.identityVerificationSessionId,
    motivo: user.identityVerificationMotivo,
    verifiedAt: user.identityVerifiedAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Verificação de identidade hospedada via Didit (sessão v3) — Motorista
 * e Empresa/Gestor verificando a PRÓPRIA identidade (`User.id` como
 * `vendor_data`). Complementar ao fluxo standalone já existente em
 * `RottaAiService.validateDocument` (documento avulso já enviado ao
 * Storage) — este aqui é o fluxo hospedado da própria Didit
 * (`verify.didit.me`), a decisão só chega depois via webhook
 * (`DiditWebhookController`), nunca na resposta de `createSession`.
 *
 * A partir desta entrega também cobre o lado ADMIN: `listForAdmin`/
 * `getForAdmin` (visão de todos os usuários), `refreshForAdmin` (pull
 * de `GET /v3/session/{id}/decision/`, pra quando uma decisão tomada
 * direto no Business Console da Didit — ex. um revisor recusando por
 * lá — não chegou pelo webhook) e `decideForAdmin` (aprova/recusa
 * direto do painel Rotta, sem precisar abrir o Business Console).
 */
@Injectable()
export class IdentityVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly didit: DiditService,
  ) {}

  /** Cria a sessão na Didit e já marca `EM_ANDAMENTO` — `identityVerificationSessionId` é o que o webhook usa depois pra saber se um evento pertence a ESTA sessão (nunca sobrescreve com uma sessão velha/abandonada). Também limpa o motivo/decisão da tentativa anterior — uma nova tentativa começa sem o "fantasma" da recusa passada. */
  async createSession(
    userId: string,
    callbackUrl?: string,
  ): Promise<IdentityVerificationSessionResult> {
    const session = await this.didit.createVerificationSession(userId, callbackUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        identityVerificationSessionId: session.sessionId,
        identityVerificationStatus: "EM_ANDAMENTO",
        identityVerificationMotivo: null,
      },
    });

    return { url: session.url, sessionId: session.sessionId };
  }

  /** Estado atual — sempre lido do banco (nunca da Didit direto): quem decide `identityVerificationStatus` é o webhook (ou a sincronização manual do Admin Rotta), este método só espelha o que já foi aplicado. */
  async getStatus(userId: string): Promise<IdentityVerificationStatusResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        identityVerificationStatus: true,
        identityVerifiedAt: true,
        identityVerificationMotivo: true,
      },
    });
    return {
      status: user.identityVerificationStatus,
      verifiedAt: user.identityVerifiedAt,
      motivo: user.identityVerificationMotivo,
    };
  }

  /** `GET /identity-verification/admin` — todos os usuários que já iniciaram ao menos uma sessão Didit (quem nunca iniciou não tem o que o admin revise aqui). */
  async listForAdmin(
    query: ListIdentityVerificationsQueryDto,
  ): Promise<AdminIdentityVerificationListResult> {
    const where: Prisma.UserWhereInput = {
      identityVerificationSessionId: { not: null },
      ...(query.status ? { identityVerificationStatus: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { nome: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { cpf: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** `GET /identity-verification/admin/:userId` — mesma linha da listagem, mais o payload bruto da última decisão aplicada (auditoria/debug). */
  async getForAdmin(userId: string): Promise<AdminIdentityVerificationDetail> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ...ADMIN_SELECT, identityVerificationDecisao: true },
    });
    return { ...toListItem(user), decisao: user.identityVerificationDecisao };
  }

  /**
   * `POST /identity-verification/admin/:userId/refresh` — pull-based
   * (`GET /v3/session/{id}/decision/`), a correção do gap relatado: uma
   * recusa feita direto no Business Console da Didit só chega à Rotta
   * pelo webhook SE o destino estiver configurado e a entrega não
   * falhar; este botão busca o estado atual direto na fonte, sem
   * depender do webhook ter chegado.
   */
  async refreshForAdmin(userId: string): Promise<AdminIdentityVerificationDetail> {
    const sessionId = await this.requireSessionId(userId);
    const decision = await this.didit.getSessionDecision(sessionId);
    await this.applyDecisionToUser(userId, decision.raw);
    return this.getForAdmin(userId);
  }

  /**
   * `POST /identity-verification/admin/:userId/decision` — aprova/recusa
   * manualmente pelo painel Rotta (`PATCH /v3/session/{id}/update-
   * status/`), sem precisar abrir o Business Console da Didit. Recusar
   * exige `comment` (é o motivo mostrado direto pro usuário reprovado —
   * nunca deixamos "reprovado, motivo desconhecido" por preguiça de
   * exigir o campo).
   */
  async decideForAdmin(
    userId: string,
    dto: DecideIdentityVerificationDto,
  ): Promise<AdminIdentityVerificationDetail> {
    if (dto.newStatus === "Declined" && !dto.comment?.trim()) {
      throw new BadRequestException(
        "Informe o motivo da recusa — ele é mostrado diretamente para o usuário.",
      );
    }

    const sessionId = await this.requireSessionId(userId);
    await this.didit.updateSessionStatus(sessionId, dto.newStatus, dto.comment);

    // A Didit não devolve a decisão atualizada no PATCH — busca de
    // volta (pull) pra garantir que o que persistimos reflete
    // exatamente o que ficou registrado do lado dela.
    const decision = await this.didit.getSessionDecision(sessionId);
    await this.applyDecisionToUser(userId, decision.raw);

    // O texto que o próprio admin escreveu é a fonte mais confiável do
    // motivo — preservado mesmo se `decision.raw` ainda não o refletir
    // (ex. a Didit não reindexou a tempo desta mesma chamada).
    if (dto.newStatus === "Declined" && dto.comment?.trim()) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { identityVerificationMotivo: dto.comment.trim() },
      });
    }

    return this.getForAdmin(userId);
  }

  private async requireSessionId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { identityVerificationSessionId: true },
    });
    if (!user.identityVerificationSessionId) {
      throw new BadRequestException(
        "Este usuário ainda não iniciou nenhuma sessão de verificação Didit.",
      );
    }
    return user.identityVerificationSessionId;
  }

  /** Núcleo compartilhado por `refreshForAdmin`/`decideForAdmin` — mesma lógica de mapeamento/extração de motivo do webhook (`DiditWebhookController`), aplicada ao payload de `GET .../decision/` em vez do envelope do webhook. */
  private async applyDecisionToUser(userId: string, raw: Record<string, unknown>): Promise<void> {
    const status = mapDiditStatus(typeof raw.status === "string" ? raw.status : undefined);
    const motivo =
      extractDiditDecisionReason(raw) ?? (status === "REPROVADA" ? DEFAULT_REJECTION_REASON : null);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        identityVerificationStatus: status,
        identityVerifiedAt: status === "APROVADA" ? new Date() : undefined,
        identityVerificationDecisao: raw as Prisma.InputJsonValue,
        identityVerificationMotivo: motivo,
      },
    });
  }
}
