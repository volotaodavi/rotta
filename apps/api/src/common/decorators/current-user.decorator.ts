import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Role } from "@/shared/enums";

/**
 * Payload minimo carregado pelo JWT de acesso (Dossie 12, Secao 4.2):
 * `sub` (usuario_id), `tenant_id`, `papel`, `vinculo_id`.
 *
 * `tenantId` e `null` para `Role.ADMIN_ROTTA` (funcionario da propria
 * Rotta, nunca vinculado a uma Empresa/tenant — Dossie 8, Secao 2) e
 * para `Role.RESPONSAVEL` (modulo Marketplace — o Responsavel e uma
 * identidade GLOBAL que pode ter Alunos/Solicitacoes/Contratos com
 * VARIAS empresas diferentes ao mesmo tempo, entao nao ha um unico
 * `Membership`/tenant que o represente; ver nota de arquitetura em
 * `Student`, `schema.prisma`). Todo outro papel sempre tem um
 * `tenantId` presente (o `Membership` que originou o login).
 *
 * `sessionId` (Dossie 15, `AUTH-05`/`AUTH-06`) identifica QUAL `Session`
 * (dispositivo) emitiu este token — opcional porque tokens de teste
 * construidos antes do modulo Auth existir (ex. `jwt-test.helper.ts` do
 * modulo de Empresas) nao exercitam nenhuma rota de sessao; todo token
 * emitido pelo `AuthService` real sempre o preenche.
 */
export interface AuthenticatedUser {
  sub: string;
  tenantId: string | null;
  role: Role;
  vinculoId: string;
  sessionId?: string;
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
