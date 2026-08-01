import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { PrismaService } from "@/infra/database/prisma.service";

/**
 * Guard de isolamento multi-tenant (Dossie 8, Secao 15 e Dossie 12,
 * Secao 15.1) — resolve o `tenant_id` exclusivamente a partir do JWT
 * (nunca de parametro de URL/body do cliente) e o define como contexto
 * de sessao do Prisma para a requisicao corrente, para que a Row-Level
 * Security do PostgreSQL seja a ultima linha de defesa mesmo que uma
 * query de aplicacao esqueca de filtrar por tenant.
 *
 * Rotas `@Public()` (ex. health check, login) pulam este guard pelo
 * mesmo motivo que pulam o `JwtAuthGuard` — nao ha usuario/tenant
 * resolvido ainda naquele ponto do fluxo. Namespace `/admin/*` (Admin
 * Rotta) usa um caminho de codigo distinto (Dossie 12, Secao 5.2) e,
 * quando implementado, tambem devera ser dispensado deste guard.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.tenantId) {
      return false;
    }

    await this.prisma.setTenantContext(user.tenantId);
    return true;
  }
}
