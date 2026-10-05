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

  /**
   * O plantão da diretoria: os erros recentes, agrupados, para o CTO
   * agente consertar sem precisar de conta de admin nem de acesso ao
   * banco (autorizado pelo fundador em 05/10/2026 — ver
   * `DiretoriaReadGuard`).
   *
   * Agrupado por mensagem de propósito: a mesma falha costuma chegar
   * dezenas de vezes, e o que o turno precisa saber é "qual defeito
   * existe e quantas pessoas bateram nele", não a lista crua.
   *
   * O que NÃO sai daqui: quem é a pessoa. Nenhum id de usuário, nenhum
   * e-mail, nenhum dado de aluno. Um relatório de erro serve para
   * consertar código, e para consertar código bastam a mensagem, a
   * tela, a pilha e o build.
   */
  async plantao(horas = 72, limite = 20) {
    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);
    const recentes = await this.repository.list({ page: 1, pageSize: 500 });

    const porMensagem = new Map<
      string,
      {
        app: string;
        mensagem: string;
        telas: Set<string>;
        buildIds: Set<string>;
        quantas: number;
        primeiraVez: string;
        ultimaVez: string;
        pilha: string | null;
      }
    >();

    for (const erro of recentes.items) {
      const quando = new Date(erro.createdAt).toISOString();
      if (new Date(erro.createdAt) < desde) continue;
      const chave = `${erro.app}::${erro.message}`;
      const atual = porMensagem.get(chave);
      if (atual) {
        atual.quantas += 1;
        atual.telas.add(erro.path);
        if (erro.buildId) atual.buildIds.add(erro.buildId);
        if (quando < atual.primeiraVez) atual.primeiraVez = quando;
        if (quando > atual.ultimaVez) atual.ultimaVez = quando;
        continue;
      }
      porMensagem.set(chave, {
        app: erro.app,
        mensagem: erro.message,
        telas: new Set([erro.path]),
        buildIds: new Set(erro.buildId ? [erro.buildId] : []),
        quantas: 1,
        primeiraVez: quando,
        ultimaVez: quando,
        pilha: erro.stack ?? null,
      });
    }

    const items = [...porMensagem.values()]
      .sort((a, b) => b.quantas - a.quantas)
      .slice(0, limite)
      .map((grupo) => ({
        app: grupo.app,
        mensagem: grupo.mensagem,
        telas: [...grupo.telas].slice(0, 5),
        buildIds: [...grupo.buildIds].slice(0, 3),
        quantas: grupo.quantas,
        primeiraVez: grupo.primeiraVez,
        ultimaVez: grupo.ultimaVez,
        // A pilha de UMA ocorrência basta para achar o arquivo; mandar
        // a de todas só encheria o contexto do turno.
        pilha: grupo.pilha?.slice(0, 4000) ?? null,
      }));

    return { janelaEmHoras: horas, gruposDeErro: items.length, items };
  }
}
