import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Response, Request } from "express";

import type { ApiErrorBody } from "@/shared/types/api-error.type";

/**
 * Filtro global de excecoes — traduz qualquer erro lancado na aplicacao
 * para o formato padrao de erro definido no Dossie 13, Secao 23:
 * `{ code, message, field?, correlationId }`, nunca stack trace ou
 * detalhe de implementacao exposto ao cliente (Dossie 10, Secao 9.11).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers["x-correlation-id"] as string | undefined) ?? randomUUID();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

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
