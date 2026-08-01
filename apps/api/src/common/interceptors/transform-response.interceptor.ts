import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { map } from "rxjs/operators";

import type { Observable } from "rxjs";

export interface ApiResponseEnvelope<T> {
  data: T;
}

/**
 * Envelopa toda resposta de sucesso em um formato consistente (`{ data }`)
 * — complementa o formato padrao de erro definido em
 * `all-exceptions.filter.ts` (Dossie 13, Secao 23), dando ao frontend um
 * unico formato a tratar em qualquer resposta, de sucesso ou erro.
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponseEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponseEnvelope<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
