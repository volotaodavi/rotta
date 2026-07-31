import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Role } from "@/shared/enums";

/**
 * Payload minimo carregado pelo JWT de acesso (Dossie 12, Secao 4.2):
 * `sub` (usuario_id), `tenant_id`, `papel`, `vinculo_id`.
 */
export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: Role;
  vinculoId: string;
}

/**
 * Extrai o usuario autenticado (ja validado pelo `JwtAuthGuard`) do
 * request — nunca confiar em um campo equivalente vindo do body/query do
 * cliente (Dossie 12, Secao 15.1: "tenant_id sempre resolvido pela
 * sessao").
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
