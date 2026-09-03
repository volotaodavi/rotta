import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRottaPapel } from "@prisma/client";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { ADMIN_AREAS_KEY } from "@/common/decorators/admin-areas.decorator";
import { AdminArea, Role } from "@/shared/enums";


/** Áreas que cada sub-papel de Admin Rotta enxerga — `GERAL` é tratado à parte (sempre tudo), nunca aparece aqui. */
const AREAS_BY_PAPEL: Record<Exclude<AdminRottaPapel, "GERAL">, ReadonlySet<AdminArea>> = {
  [AdminRottaPapel.SUPORTE]: new Set([AdminArea.SUPORTE, AdminArea.IDENTIDADE, AdminArea.VEICULOS]),
  [AdminRottaPapel.FINANCEIRO]: new Set([AdminArea.FINANCEIRO]),
};

/**
 * Restringe sub-papéis DENTRO de `Role.ADMIN_ROTTA` (pedido do usuário
 * 03/09/2026 — ver `AdminArea`/`User.adminRottaPapel`). Roda depois de
 * `RolesGuard` (ordem em `app.module.ts`): aquele já garantiu que só
 * papéis autorizados chegam aqui — este guard só ENTRA EM AÇÃO quando o
 * ator é `ADMIN_ROTTA` com `adminRottaPapel !== GERAL`; qualquer outro
 * papel (Empresa, Gestor, Responsável, Motorista...) passa direto,
 * mesmo numa rota marcada com `@AdminAreas` (ela também aceita esses
 * papéis via `@Roles` — este guard nunca reavalia isso).
 */
@Injectable()
export class AdminAreaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || user.role !== Role.ADMIN_ROTTA) {
      return true;
    }

    const papel = user.adminPapel ?? AdminRottaPapel.GERAL;
    if (papel === AdminRottaPapel.GERAL) {
      return true;
    }

    const requiredAreas = this.reflector.getAllAndOverride<AdminArea[]>(ADMIN_AREAS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sem `@AdminAreas` nesta rota: default seguro é GERAL-only (ver
    // comentário do decorator) — nunca vaza uma rota nova/esquecida.
    if (!requiredAreas || requiredAreas.length === 0) {
      return false;
    }

    const allowedAreas = AREAS_BY_PAPEL[papel];
    return requiredAreas.some((area) => allowedAreas.has(area));
  }
}
