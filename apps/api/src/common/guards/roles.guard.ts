import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { Role } from "@/shared/enums";

import { ROLES_KEY } from "@/common/decorators/roles.decorator";

/**
 * Guard de autorizacao RBAC (Dossie 12, Secao 5.1) — valida o papel do
 * usuario contra a lista de papeis permitidos daquela rota (`@Roles(...)`)
 * antes de qualquer codigo de controller executar. Roda depois do
 * `JwtAuthGuard` (ordem definida em `app.module.ts`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    return Boolean(user) && requiredRoles.includes(user!.role);
  }
}
