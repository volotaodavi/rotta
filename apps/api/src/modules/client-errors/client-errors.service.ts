import { Inject, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import {
  toClientErrorReportResponseDto,
  type ClientErrorReportResponseDto,
  type ListClientErrorReportsResponseDto,
} from "./dto/client-error-report-response.dto";
import {
  CLIENT_ERROR_REPORT_REPOSITORY,
  type ClientErrorReportRepository,
} from "./repositories/client-error-report.repository";

import type { CreateClientErrorReportDto } from "./dto/create-client-error-report.dto";
import type { ListClientErrorReportsQueryDto } from "./dto/list-client-error-reports-query.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

/**
 * Núcleo da Frente "captura de erro real do cliente" — ver a nota
 * completa em `ClientErrorReport` (schema.prisma). `POST /client-errors`
 * é público (`@Public()` no controller): um erro pode acontecer ANTES do
 * login terminar, e essa é justamente a hora em que mais precisamos de
 * visibilidade.
 */
@Injectable()
export class ClientErrorsService {
  private readonly logger = new Logger(ClientErrorsService.name);

  constructor(
    @Inject(CLIENT_ERROR_REPORT_REPOSITORY)
    private readonly repository: ClientErrorReportRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Extrai `userId` do `Authorization: Bearer <token>` quando presente e
   * válido — best-effort, nunca lança: um token ausente, expirado ou
   * inválido não pode impedir o próprio relatório de erro de ser salvo
   * (isso só trocaria "não vejo o erro" por "não vejo o erro E perdi o
   * relatório dele"). `undefined` quando não dá pra resolver.
   */
  private resolveUserId(authorizationHeader: string | undefined): string | undefined {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return undefined;
    }
    const token = authorizationHeader.slice("Bearer ".length);
    try {
      const payload = this.jwtService.verify<AuthenticatedUser>(token);
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  async create(
    dto: CreateClientErrorReportDto,
    context: { authorizationHeader?: string; userAgent?: string },
  ): Promise<ClientErrorReportResponseDto> {
    const userId = this.resolveUserId(context.authorizationHeader);

    const created = await this.repository.create({
      app: dto.app,
      message: dto.message,
      digest: dto.digest,
      stack: dto.stack,
      path: dto.path,
      userAgent: context.userAgent,
      buildId: dto.buildId,
      serviceWorkerActive: dto.serviceWorkerActive,
      source: dto.source,
      userId,
      companyId: dto.companyId,
    });

    // Loga estruturado também (nestjs-pino) — nunca a única cópia (o
    // registro em `ClientErrorReport` é o canal durável e consultável),
    // mas mantém o mesmo padrão de qualquer erro real do processo.
    this.logger.warn(
      `Erro de cliente reportado (${dto.app}, ${dto.path}): ${dto.message}` +
        (dto.digest ? ` [digest=${dto.digest}]` : ""),
    );

    return toClientErrorReportResponseDto(created);
  }

  async list(query: ListClientErrorReportsQueryDto): Promise<ListClientErrorReportsResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.repository.list({
      app: query.app,
      digest: query.digest,
      buildId: query.buildId,
      page,
      pageSize,
    });

    return {
      items: result.items.map(toClientErrorReportResponseDto),
      total: result.total,
      page,
      pageSize,
    };
  }
}
