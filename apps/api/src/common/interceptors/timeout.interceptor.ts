import {
  Injectable,
  RequestTimeoutException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { catchError, timeout, TimeoutError } from "rxjs";

import type { Observable } from "rxjs";

/**
 * Timeout global de requisicao (Dossie 4, Secao 20.4 — SLOs de
 * referencia). Protege o caminho sincrono de qualquer chamada que
 * demore alem do aceitavel (ex. dependencia externa lenta), retornando
 * 408 em vez de deixar a conexao pendurada indefinidamente.
 */
const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(DEFAULT_TIMEOUT_MS),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          throw new RequestTimeoutException();
        }
        throw error;
      }),
    );
  }
}
