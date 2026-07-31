import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Logger } from "nestjs-pino";
import { tap } from "rxjs/operators";
import type { Observable } from "rxjs";

/**
 * Interceptor de logging estruturado (Dossie 12, Secao 10.3) — gera (ou
 * propaga) o id de correlacao da requisicao e o anexa ao log de
 * acesso, para permitir reconstituir a jornada completa de uma acao
 * entre camadas (Core API, Worker, Realtime Gateway).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; url: string; headers: Record<string, string> }>();

    const correlationId = request.headers["x-correlation-id"] ?? randomUUID();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          correlationId,
          method: request.method,
          url: request.url,
          durationMs: Date.now() - startedAt,
        });
      }),
    );
  }
}
