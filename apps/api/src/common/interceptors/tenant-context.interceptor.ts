import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";

import { tenantContextStorage, type TenantContext } from "@/infra/database/tenant-context";

/**
 * Propaga o `TenantContext` resolvido pelo `TenantGuard` (em
 * `request.tenantContext`) para `AsyncLocalStorage`, de onde
 * `PrismaService.withTenant` o lê.
 *
 * ## Por que isto é um interceptor, e não o próprio guard chamando
 * `tenantContextStorage.enterWith(...)`
 *
 * Foi tentado primeiro chamar `enterWith` diretamente dentro do
 * `TenantGuard` — e comprovadamente **não funciona**: reproduzido com um
 * `console.error` de diagnóstico, o guard via `role: "admin_rotta"`
 * corretamente, mas `PrismaService.withTenant` lia `bypass: false`
 * alguns frames de call stack depois, dentro do mesmo request. Causa
 * raiz: o pipeline de Guards→Interceptors→Controller do NestJS é
 * construído sobre Observables/Promises compostos (`Promise.all` sobre
 * os guards, depois um `.then()` que já foi *criado* antes de qualquer
 * guard individual rodar) — `AsyncLocalStorage.enterWith` só afeta
 * continuations que começam **depois** da chamada, na mesma cadeia
 * causal; um `.then()` já agendado por um combinador criado
 * anteriormente não herda a mutação.
 *
 * A correção robusta: um interceptor cujo Observable de retorno só
 * chama (`subscribe`) o `next.handle()` de dentro do callback síncrono
 * de `tenantContextStorage.run(...)`. Como a *subscription* real
 * (que efetivamente invoca o controller e tudo abaixo dele) acontece
 * dentro dessa chamada síncrona, o `AsyncLocalStorage` propaga
 * corretamente por toda a cadeia de `await`/Promise que se inicia a
 * partir dali — o mesmo mecanismo (propagação através de Promises,
 * nunca através de combinadores já criados antes da mutação) validado
 * em um teste de carga dedicado durante o módulo de Empresas (Dossiê 16).
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ tenantContext?: TenantContext }>();
    const tenantContext: TenantContext = request.tenantContext ?? { tenantId: null, bypass: false };

    return new Observable((subscriber) => {
      tenantContextStorage.run(tenantContext, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
