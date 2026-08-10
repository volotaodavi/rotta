import { randomUUID } from "node:crypto";

import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";


import type { ApiErrorBody } from "@/shared/types/api-error.type";
import type { Response, Request } from "express";

import { ErrorTrackingService } from "@/infra/observability/error-tracking.service";

/**
 * Filtro global de excecoes — traduz qualquer erro lancado na aplicacao
 * para o formato padrao de erro definido no Dossie 13, Secao 23:
 * `{ code, message, field?, correlationId }`, nunca stack trace ou
 * detalhe de implementacao exposto ao cliente (Dossie 10, Secao 9.11).
 *
 * Todo erro nao esperado (fora de `HttpException`, ex. um bug real ou
 * falha de infraestrutura) e sempre logado no servidor com o
 * `correlationId` correspondente antes de responder — sem isso, um 500
 * genuino fica invisivel nos logs (gap real encontrado e corrigido
 * durante o modulo de Empresas, testando o fluxo de cadastro ponta a
 * ponta pela primeira vez).
 *
 * Dossiê 33 (Prompt 23, observabilidade): o mesmo 500 também é
 * reportado ao `ErrorTrackingService` (Sentry, opcional) — o log
 * estruturado sozinho exige alguém lendo-o ativamente para notar uma
 * falha; o rastreamento de erro agrupa/alerta automaticamente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly errorTracking: ErrorTrackingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers["x-correlation-id"] as string | undefined) ?? randomUUID();

    const status: number =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${correlationId}] ${request.method} ${request.url}`, stack);
      this.errorTracking.captureException(exception, {
        correlationId,
        method: request.method,
        url: request.url,
      });
    }

    const body: ApiErrorBody = this.buildErrorBody(exception, correlationId);

    response.status(status).json(body);
  }

  private buildErrorBody(exception: unknown, correlationId: string): ApiErrorBody {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === "string"
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);

      return {
        code: exception.constructor.name.replace(/Exception$/, "").toUpperCase(),
        message: Array.isArray(message) ? message.join(", ") : message,
        correlationId,
      };
    }

    return {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente em instantes.",
      correlationId,
    };
  }
}
