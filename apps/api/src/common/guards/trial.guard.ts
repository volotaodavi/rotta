import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { TrialExpiradoException } from "../exceptions/trial-expirado.exception";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { Request } from "express";

import { resolveTrialBloqueioMotivo } from "@/common/billing/resolve-trial-bloqueio.util";
import { SKIP_TRIAL_GUARD_KEY } from "@/common/decorators/skip-trial-guard.decorator";
import { PrismaService } from "@/infra/database/prisma.service";
import { Role } from "@/shared/enums";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Bloqueia ações de escrita de uma empresa em `TRIAL` vencido (+1 dia de
 * graça, `TRIAL_GRACE_DAYS`) ou `INADIMPLENTE`/`SUSPENSO`/`CANCELADO`
 * (Dossiê 26, faturamento — pedido do usuário: "bloquear toda e
 * qualquer ação"). Registrado global (`APP_GUARD`, depois de
 * `RolesGuard` em `app.module.ts`) — mesmo padrão dos demais guards
 * globais, nunca aplicado rota a rota.
 *
 * Só age em `Role.EMPRESA`/`Role.GESTOR` — nunca Admin Rotta (não tem
 * `Company`), Responsável (não paga), Motorista/Monitor (o público que
 * paga é quem administra a empresa, não quem dirige — bloquear a
 * operação diária penalizaria os alunos, não foi pedido).
 *
 * Só bloqueia métodos de escrita — leitura nunca é bloqueada, pra tela
 * continuar renderizando o cadeado/estado read-only normalmente.
 * `@SkipTrialGuard()` (Support, Billing) sempre passa direto.
 *
 * Consulta `status`/`trialExpiraEm` via `PrismaService.withBypass` (não
 * `withTenant`) de propósito: guards globais rodam ANTES do
 * `TenantContextInterceptor` popular o `AsyncLocalStorage` (guards →
 * interceptors, nessa ordem, no pipeline do Nest) — `withBypass` seta
 * seu próprio contexto de RLS na mesma transação, sem depender do ALS
 * ainda não populado neste ponto do request.
 */
@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRIAL_GUARD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const actor = request.user;
    if (!actor || !WRITE_METHODS.has(request.method)) {
      return true;
    }
    if (actor.role !== Role.EMPRESA && actor.role !== Role.GESTOR) {
      return true;
    }
    if (!actor.tenantId) {
      return true;
    }

    const company = await this.prisma.withBypass(
      this.prisma.company.findUnique({
        where: { id: actor.tenantId },
        select: { status: true, trialExpiraEm: true },
      }),
    );
    if (!company) {
      return true;
    }

    const motivo = resolveTrialBloqueioMotivo(company.status, company.trialExpiraEm);
    if (motivo) {
      throw new TrialExpiradoException(motivo);
    }
    return true;
  }
}
