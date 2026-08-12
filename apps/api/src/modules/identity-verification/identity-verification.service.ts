import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/infra/database/prisma.service";
import { DiditService } from "@/infra/didit/didit.service";

export interface IdentityVerificationSessionResult {
  url: string;
  sessionId: string;
}

export interface IdentityVerificationStatusResult {
  status: string;
  verifiedAt: Date | null;
}

/**
 * Verificação de identidade hospedada via Didit (sessão v3) — Motorista
 * e Empresa/Gestor verificando a PRÓPRIA identidade (`User.id` como
 * `vendor_data`). Complementar ao fluxo standalone já existente em
 * `RottaAiService.validateDocument` (documento avulso já enviado ao
 * Storage) — este aqui é o fluxo hospedado da própria Didit
 * (`verify.didit.me`), a decisão só chega depois via webhook
 * (`DiditWebhookController`), nunca na resposta de `createSession`.
 */
@Injectable()
export class IdentityVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly didit: DiditService,
  ) {}

  /** Cria a sessão na Didit e já marca `EM_ANDAMENTO` — `identityVerificationSessionId` é o que o webhook usa depois pra saber se um evento pertence a ESTA sessão (nunca sobrescreve com uma sessão velha/abandonada). */
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
      },
    });

    return { url: session.url, sessionId: session.sessionId };
  }

  /** Estado atual — sempre lido do banco (nunca da Didit direto): quem decide `identityVerificationStatus` é o webhook, este método só espelha o que já foi aplicado. */
  async getStatus(userId: string): Promise<IdentityVerificationStatusResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { identityVerificationStatus: true, identityVerifiedAt: true },
    });
    return { status: user.identityVerificationStatus, verifiedAt: user.identityVerifiedAt };
  }
}
