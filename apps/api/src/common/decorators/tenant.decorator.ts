import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { AuthenticatedUser } from "./current-user.decorator";

/**
 * Atalho para extrair apenas o `tenant_id` do usuario autenticado
 * (Dossie 15, Secao 1 — RLS/multi-tenant). Preferir `@CurrentUser()`
 * quando mais de um campo do usuario for necessario.
 */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
  return request.user.tenantId;
});
