import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { TenantContext } from "@/infra/database/tenant-context";

import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { Role } from "@/shared/enums";


/**
 * Guard de isolamento multi-tenant (Dossie 8, Secao 15 e Dossie 12,
 * Secao 15.1) — resolve o `tenant_id` exclusivamente a partir do JWT
 * (nunca de parametro de URL/body do cliente) e publica o resultado em
 * `request.tenantContext`, para o `TenantContextInterceptor` propagar
 * via `AsyncLocalStorage` (ver a nota de implementacao em
 * `tenant-context.interceptor.ts` sobre por que a propagacao **precisa**
 * ser feita por um interceptor, nunca por este guard chamando
 * `tenantContextStorage.enterWith(...)` diretamente — foi tentado e
 * comprovadamente perde o contexto entre o guard e o controller/service
 * no pipeline baseado em Observables do NestJS).
 *
 * Rotas `@Public()` (ex. health check, login) pulam este guard pelo
 * mesmo motivo que pulam o `JwtAuthGuard` — nao ha usuario/tenant
 * resolvido ainda naquele ponto do fluxo.
 *
 * `Role.ADMIN_ROTTA` e `Role.RESPONSAVEL` sao os dois papeis sem
 * `tenantId` (Dossie 8, Secao 2 — funcionario da Rotta e Responsavel do
 * modulo Marketplace, respectivamente, nenhum vinculado a uma Empresa)
 * — sem este caso especial, o guard reprovaria (`return false`) toda
 * requisicao desses papeis por falta de `tenantId`, tornando-os
 * inoperantes (bug coberto pelo modulo de Empresas, Dossie 16, ja que e
 * o primeiro modulo com uma rota exclusiva de Admin Rotta).
 *
 * DIFERENÇA CRÍTICA entre os dois: só Admin Rotta publica
 * `bypass: true` (funcionario da Rotta, deliberadamente cross-tenant).
 * Responsável publica `bypass: false` — ele NÃO tem permissão
 * cross-tenant nenhuma; `withTenant(...)` genérico simplesmente nao
 * teria nenhum tenant para mostrar a ele (0 linhas em qualquer tabela
 * com RLS, o padrão seguro documentado em `PrismaService`). O acesso
 * real do Responsável às SUAS PRÓPRIAS linhas em tabelas com RLS
 * (`transport_requests`/`contracts`/`ratings`) é resolvido nos
 * repositórios daqueles módulos via `withBypass` EXPLÍCITO, sempre
 * filtrado por `responsavelId = actor.sub` — nunca por este guard.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser; tenantContext?: TenantContext }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role === Role.ADMIN_ROTTA) {
      request.tenantContext = { tenantId: null, bypass: true };
      return true;
    }

    if (user.role === Role.RESPONSAVEL) {
      request.tenantContext = { tenantId: null, bypass: false };
      return true;
    }

    if (!user.tenantId) {
      return false;
    }

    request.tenantContext = { tenantId: user.tenantId, bypass: false };
    return true;
  }
}
