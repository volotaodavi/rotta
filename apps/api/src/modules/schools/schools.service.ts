import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationEventType } from "@prisma/client";

import { toSchoolAccessPointResponseDto } from "./mappers/school-access-point.mapper";
import {
  toListSchoolCompanyLinksResponseDto,
  toSchoolCompanyLinkResponseDto,
} from "./mappers/school-company-link.mapper";
import {
  toListSchoolsResponseDto,
  toSchoolResponseDto,
  toSchoolSuggestionResponseDto,
} from "./mappers/school.mapper";
import { DUPLICATE_NAME_SIMILARITY_THRESHOLD, nameSimilarity } from "./school-duplicate.util";
import {
  combinedScore,
  fuzzyNameSimilarity,
  proximityScore,
  tokenize,
} from "./school-fuzzy-search.util";
import {
  mapRowToCreateSchoolData,
  parseCsvRows,
  parseExcelRows,
  parseJsonRows,
} from "./school-import.util";
import {
  SCHOOL_ACCESS_POINT_REPOSITORY,
  SCHOOL_COMPANY_LINK_REPOSITORY,
  SCHOOL_REPOSITORY,
} from "./schools.constants";

import type { CreateSchoolAccessPointDto } from "./dto/create-school-access-point.dto";
import type { CreateSchoolCompanyLinkDto } from "./dto/create-school-company-link.dto";
import type { CreateSchoolDto } from "./dto/create-school.dto";
import type { ImportSchoolsResultDto } from "./dto/import-schools-result.dto";
import type { ListSchoolsQueryDto } from "./dto/list-schools-query.dto";
import type { SchoolAccessPointResponseDto } from "./dto/school-access-point-response.dto";
import type {
  ListSchoolCompanyLinksResponseDto,
  SchoolCompanyLinkResponseDto,
} from "./dto/school-company-link-response.dto";
import type { SchoolDashboardResponseDto } from "./dto/school-dashboard-response.dto";
import type {
  ListSchoolsResponseDto,
  SchoolResponseDto,
  SuggestSchoolsResponseDto,
} from "./dto/school-response.dto";
import type { SuggestSchoolsQueryDto } from "./dto/suggest-schools-query.dto";
import type { UpdateSchoolAccessPointDto } from "./dto/update-school-access-point.dto";
import type { UpdateSchoolStatusDto } from "./dto/update-school-status.dto";
import type { UpdateSchoolDto } from "./dto/update-school.dto";
import type { SchoolAccessPointRepository } from "./repositories/school-access-point.repository";
import type { SchoolCompanyLinkRepository } from "./repositories/school-company-link.repository";
import type { CreateSchoolData, SchoolRepository } from "./repositories/school.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type {
  AuditLogResponseDto,
  ListAuditLogsResponseDto,
} from "@/common/dto/audit-log-response.dto";
import type { School } from "@prisma/client";

import {
  toCsv,
  toExcelBuffer,
  toPdfBuffer,
  type ExportColumn,
} from "@/common/utils/tabular-export.util";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { Role } from "@/shared/enums";
import { haversineDistanceKm } from "@/shared/utils/geo.util";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/** Quantas candidatas o banco devolve pra `sugerirEscolas` reordenar em memória — pequeno o bastante pra nunca pesar, grande o bastante pra não perder a escola certa antes da reordenação por similaridade. */
const SUGGESTION_CANDIDATE_LIMIT = 40;

const ENTIDADE_TIPO = "School";

/**
 * Núcleo de negócio do módulo Escolas (briefing "Gestão de Escolas").
 * Mesmo padrão de `VehiclesService`/`CompaniesService`: nunca executa
 * uma query diretamente (sempre via os 3 repositórios do módulo),
 * audita toda escrita (best-effort, nunca bloqueia o fluxo principal).
 *
 * DIFERENÇA CENTRAL: `School`/`SchoolAccessPoint` não têm tenant
 * próprio (catálogo compartilhado — ver nota no schema.prisma). RBAC
 * aqui não é "dono vs. não-dono", é "papel de gestão vs. papel de
 * consulta escopada": Motorista/Monitor só enxergam escolas
 * atualmente vinculadas à SUA empresa (via `SchoolCompanyLink` —
 * aproximação honesta de "vinculadas às suas rotas" enquanto o módulo
 * de Rotas não existe, documentado em `School` no schema).
 */
@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(
    @Inject(SCHOOL_REPOSITORY) private readonly schoolRepository: SchoolRepository,
    @Inject(SCHOOL_ACCESS_POINT_REPOSITORY)
    private readonly accessPointRepository: SchoolAccessPointRepository,
    @Inject(SCHOOL_COMPANY_LINK_REPOSITORY)
    private readonly companyLinkRepository: SchoolCompanyLinkRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
  ) {}

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private async recordAudit(input: {
    companyId?: string;
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.record({ ...input, entidadeTipo: ENTIDADE_TIPO });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (School ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Motorista/Monitor só veem escolas vinculadas à própria empresa
   * (404, nunca 403, mesmo princípio de não-enumeração já usado em
   * `VehiclesService`/`CompaniesService`). Demais papéis (inclusive
   * Admin Rotta) enxergam qualquer escola — é catálogo compartilhado.
   */
  private async assertCanView(school: School, actor: AuthenticatedUser): Promise<void> {
    if (actor.role !== Role.MOTORISTA && actor.role !== Role.MONITOR) return;

    const links = await this.companyLinkRepository.findActiveForSchool(school.id);
    const isLinkedToOwnCompany = links.some((link) => link.companyId === actor.tenantId);
    if (!isLinkedToOwnCompany) {
      throw new NotFoundException("Escola não encontrada.");
    }
  }

  private async fetchOrThrow(id: string, actor: AuthenticatedUser): Promise<School> {
    const school = await this.schoolRepository.findById(id);
    if (!school) {
      throw new NotFoundException("Escola não encontrada.");
    }
    await this.assertCanView(school, actor);
    return school;
  }

  private async generateCodigoInterno(): Promise<string> {
    const sequence = await this.schoolRepository.nextCodigoInternoSequence();
    return `ESC-${String(sequence).padStart(6, "0")}`;
  }

  // ---------------------------------------------------------------------
  // CRUD (briefing "CADASTRO")
  // ---------------------------------------------------------------------

  async create(
    dto: CreateSchoolDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    /**
     * Só usado pelo autocadastro rápido do Responsável (`GeoPipelineService.
     * quickRegisterSchool`, `POST /geo/schools/quick-register`) — sem
     * `status`/`origemCadastro`, mantém exatamente o comportamento de
     * sempre (`ATIVA`/`MANUAL`, cadastro por Empresa/Gestor/Admin Rotta
     * já confia na fonte). Uma escola que um Responsável digitou às
     * pressas no meio do cadastro do filho nasce `EM_ANALISE` — mesma
     * cautela do que a Education Sync Agent já aplica pra toda escola
     * nova vinda do Censo Escolar — nunca `ATIVA` sem alguém da gestão
     * revisar.
     */
    overrides?: { status?: School["status"]; origemCadastro?: string },
  ): Promise<SchoolResponseDto> {
    if (dto.codigoInep) {
      const existing = await this.schoolRepository.findByCodigoInep(dto.codigoInep);
      if (existing) {
        throw new ConflictException("Já existe uma escola cadastrada com este código INEP.");
      }
    }

    const codigoInterno = await this.generateCodigoInterno();
    const data: CreateSchoolData = {
      ...dto,
      codigoInterno,
      status: overrides?.status ?? "ATIVA",
      origemCadastro: overrides?.origemCadastro ?? "MANUAL",
      criadoPorId: actor.sub,
    };

    const school = await this.schoolRepository.create(data);

    await this.recordAudit({
      companyId: actor.tenantId ?? undefined,
      entidadeId: school.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { nomeOficial: school.nomeOficial, codigoInterno: school.codigoInterno },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // Empresa/Gestor cadastrando uma escola nova presumivelmente já a
    // atende — vínculo automático best-effort (nunca falha o cadastro
    // da escola em si; ver nota de escopo em `SchoolCompanyLinkRepository`).
    if ((actor.role === Role.EMPRESA || actor.role === Role.GESTOR) && actor.tenantId) {
      try {
        const link = await this.companyLinkRepository.create({
          schoolId: school.id,
          companyId: actor.tenantId,
          vinculadoPorId: actor.sub,
        });
        await this.recordAudit({
          companyId: actor.tenantId,
          entidadeId: school.id,
          acao: "COMPANY_LINKED",
          atorUserId: actor.sub,
          dadosDepois: { linkId: link.id, companyId: actor.tenantId },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      } catch (error) {
        this.logger.warn(
          `Não foi possível vincular automaticamente a empresa ${actor.tenantId} à escola ${school.id} recém-criada.`,
        );
        this.logger.warn(error instanceof Error ? error.message : String(error));
      }
    }

    const { titulo, corpo } = this.messagePersonalizationService.novaEscola(school.nomeOficial);
    this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
      userId: actor.sub,
      companyId: actor.tenantId ?? undefined,
      tipo: NotificationEventType.NOVA_ESCOLA,
      titulo,
      corpo,
      dadosContexto: { schoolId: school.id },
    });

    return toSchoolResponseDto(school);
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<SchoolResponseDto> {
    const school = await this.fetchOrThrow(id, actor);
    return toSchoolResponseDto(school);
  }

  async update(
    id: string,
    dto: UpdateSchoolDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SchoolResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);

    const changedKeys = (Object.keys(dto) as (keyof UpdateSchoolDto)[]).filter(
      (key) => dto[key] !== undefined,
    );
    if (changedKeys.length === 0) {
      return toSchoolResponseDto(existing);
    }

    if (dto.codigoInep && dto.codigoInep !== existing.codigoInep) {
      const duplicate = await this.schoolRepository.findByCodigoInep(dto.codigoInep);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException("Já existe uma escola cadastrada com este código INEP.");
      }
    }

    const dadosAntes: Record<string, unknown> = {};
    const dadosDepois: Record<string, unknown> = {};
    for (const key of changedKeys) {
      dadosAntes[key] = existing[key as keyof School];
      dadosDepois[key] = dto[key];
    }

    const updated = await this.schoolRepository.update(id, dto);

    await this.recordAudit({
      companyId: actor.tenantId ?? undefined,
      entidadeId: id,
      acao: "UPDATED",
      atorUserId: actor.sub,
      dadosAntes,
      dadosDepois,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSchoolResponseDto(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateSchoolStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SchoolResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    const updated = await this.schoolRepository.update(id, { status: dto.status });

    await this.recordAudit({
      companyId: actor.tenantId ?? undefined,
      entidadeId: id,
      acao: "STATUS_CHANGED",
      atorUserId: actor.sub,
      dadosAntes: { status: existing.status },
      dadosDepois: { status: dto.status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSchoolResponseDto(updated);
  }

  async remove(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    await this.fetchOrThrow(id, actor);
    await this.schoolRepository.update(id, { deletedAt: new Date() });

    await this.recordAudit({
      companyId: actor.tenantId ?? undefined,
      entidadeId: id,
      acao: "DELETED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  // ---------------------------------------------------------------------
  // Pesquisa/Filtros (briefing "PESQUISA"/"FILTROS")
  // ---------------------------------------------------------------------

  async list(
    query: ListSchoolsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListSchoolsResponseDto> {
    const isScopedRole = actor.role === Role.MOTORISTA || actor.role === Role.MONITOR;
    const companyId = isScopedRole ? (actor.tenantId ?? undefined) : query.companyId;

    const result = await this.schoolRepository.list({
      search: query.search,
      cidade: query.cidade,
      estado: query.estado,
      redeEnsino: query.redeEnsino,
      tipo: query.tipo,
      turno: query.turno,
      status: query.status,
      companyId,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return toListSchoolsResponseDto(result, query.page, query.pageSize);
  }

  /**
   * Autocomplete de escola do Responsável (pedido do usuário: "mesmo
   * escrevendo errado... vai dar uma sugestão de escola baseada no nome e
   * localização") — busca em duas fases (ver `school-fuzzy-search.util.ts`
   * para o racional completo): um conjunto amplo de candidatas vem do
   * banco por token, depois é reordenado aqui por similaridade de nome
   * (tolerante a erro de digitação) e, quando `latitude`/`longitude` são
   * informadas, por proximidade. Nunca filtra por distância — só
   * desempata; uma escola longe com nome muito mais parecido ainda
   * aparece antes de uma perto com nome bem diferente.
   */
  async sugerirEscolas(query: SuggestSchoolsQueryDto): Promise<SuggestSchoolsResponseDto> {
    const tokens = tokenize(query.q);
    const candidatas = await this.schoolRepository.searchCandidates(
      tokens,
      SUGGESTION_CANDIDATE_LIMIT,
    );

    const temLocalizacao = query.latitude !== undefined && query.longitude !== undefined;

    const pontuadas = candidatas.map((school) => {
      const nomeScore = fuzzyNameSimilarity(query.q, school.nomeOficial);
      const distanciaKm =
        temLocalizacao && school.latitude && school.longitude
          ? haversineDistanceKm(
              query.latitude!,
              query.longitude!,
              Number(school.latitude),
              Number(school.longitude),
            )
          : null;
      const proximidade = distanciaKm === null ? null : proximityScore(distanciaKm);
      return {
        school,
        distanciaKm,
        score: combinedScore(nomeScore, proximidade),
      };
    });

    const ordenadas = pontuadas
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit)
      .map(({ school, distanciaKm }) => toSchoolSuggestionResponseDto(school, distanciaKm));

    return { items: ordenadas };
  }

  /** Detecção de duplicidade (briefing "ROTTA AI") — implementação real, não depende de provedor externo (ver `school-duplicate.util.ts`). */
  async checkPossibleDuplicates(
    nomeOficial: string,
    cidade: string,
    estado: string,
  ): Promise<SchoolResponseDto[]> {
    const { items } = await this.schoolRepository.list({
      cidade,
      estado,
      page: 1,
      pageSize: 500,
      sortBy: "nomeOficial",
      sortOrder: "asc",
    });

    return items
      .filter(
        (school) =>
          nameSimilarity(school.nomeOficial, nomeOficial) >= DUPLICATE_NAME_SIMILARITY_THRESHOLD,
      )
      .map(toSchoolResponseDto);
  }

  // ---------------------------------------------------------------------
  // Dashboard (briefing "DASHBOARD")
  // ---------------------------------------------------------------------

  async getDashboard(
    actor: AuthenticatedUser,
    companyIdParam?: string,
  ): Promise<SchoolDashboardResponseDto> {
    const companyId =
      actor.role === Role.ADMIN_ROTTA ? companyIdParam : (actor.tenantId ?? undefined);
    const schools = await this.schoolRepository.listAllActive(companyId);

    const turnos = new Set<string>();
    for (const school of schools) {
      for (const turno of school.turnosAtendidos) turnos.add(turno);
    }

    return {
      totalEscolas: schools.length,
      escolasPublicas: schools.filter((s) => s.dependenciaAdministrativa !== "PRIVADA").length,
      escolasPrivadas: schools.filter((s) => s.dependenciaAdministrativa === "PRIVADA").length,
      // Placeholders honestos — módulos de Alunos/Rotas ainda não existem (ver nota em `School`, schema.prisma).
      alunosVinculados: 0,
      rotasAtivas: 0,
      turnosAtendidos: [...turnos],
    };
  }

  // ---------------------------------------------------------------------
  // Exportação (briefing "EXPORTAÇÃO")
  // ---------------------------------------------------------------------

  async exportList(
    query: ListSchoolsQueryDto,
    actor: AuthenticatedUser,
    format: "csv" | "excel" | "pdf",
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const isScopedRole = actor.role === Role.MOTORISTA || actor.role === Role.MONITOR;
    const companyId = isScopedRole ? (actor.tenantId ?? undefined) : query.companyId;

    const { items } = await this.schoolRepository.list({
      search: query.search,
      cidade: query.cidade,
      estado: query.estado,
      redeEnsino: query.redeEnsino,
      tipo: query.tipo,
      turno: query.turno,
      status: query.status,
      companyId,
      page: 1,
      pageSize: 10_000,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    const schools = items.map(toSchoolResponseDto);

    const columns: ExportColumn<SchoolResponseDto>[] = [
      { header: "Código Interno", value: (s) => s.codigoInterno },
      { header: "Código INEP", value: (s) => s.codigoInep },
      { header: "Nome Oficial", value: (s) => s.nomeOficial },
      { header: "Cidade", value: (s) => s.cidade },
      { header: "Estado", value: (s) => s.estado },
      { header: "Dependência", value: (s) => s.dependenciaAdministrativa },
      { header: "Status", value: (s) => s.status },
    ];

    if (format === "csv") {
      return {
        buffer: Buffer.from(toCsv(schools, columns), "utf-8"),
        contentType: "text/csv; charset=utf-8",
        filename: "escolas.csv",
      };
    }
    if (format === "excel") {
      return {
        buffer: await toExcelBuffer(schools, columns, "Escolas"),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: "escolas.xlsx",
      };
    }
    return {
      buffer: await toPdfBuffer(schools, columns, "Rotta — Relatório de Escolas"),
      contentType: "application/pdf",
      filename: "escolas.pdf",
    };
  }

  // ---------------------------------------------------------------------
  // Importação (briefing "IMPORTAÇÃO")
  // ---------------------------------------------------------------------

  async importFromFile(
    file: Express.Multer.File,
    format: "csv" | "excel" | "json",
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<ImportSchoolsResultDto> {
    const rows =
      format === "csv"
        ? parseCsvRows(file.buffer.toString("utf-8"))
        : format === "json"
          ? parseJsonRows(file.buffer.toString("utf-8"))
          : await parseExcelRows(file.buffer);

    const erros: { linha: number; mensagem: string }[] = [];
    let importadas = 0;

    for (const [index, row] of rows.entries()) {
      const linha = index + 2; // +1 header, +1 base 1-indexada
      const result = mapRowToCreateSchoolData(row);
      if (result.error || !result.data) {
        erros.push({ linha, mensagem: result.error ?? "Linha inválida." });
        continue;
      }

      if (result.data.codigoInep) {
        const existing = await this.schoolRepository.findByCodigoInep(result.data.codigoInep);
        if (existing) {
          erros.push({ linha, mensagem: `Código INEP "${result.data.codigoInep}" já cadastrado.` });
          continue;
        }
      }

      try {
        const codigoInterno = await this.generateCodigoInterno();
        const school = await this.schoolRepository.create({
          ...result.data,
          codigoInterno,
          status: "EM_ANALISE",
          origemCadastro: `IMPORT_${format.toUpperCase()}`,
          criadoPorId: actor.sub,
        });
        await this.recordAudit({
          companyId: actor.tenantId ?? undefined,
          entidadeId: school.id,
          acao: "IMPORTED",
          atorUserId: actor.sub,
          dadosDepois: { nomeOficial: school.nomeOficial, origemCadastro: school.origemCadastro },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
        importadas += 1;
      } catch (error) {
        erros.push({
          linha,
          mensagem: error instanceof Error ? error.message : "Erro desconhecido ao gravar a linha.",
        });
      }
    }

    return { totalLinhas: rows.length, importadas, erros };
  }

  // ---------------------------------------------------------------------
  // Portões e Pontos de Embarque (briefing "PORTÕES E PONTOS DE EMBARQUE")
  // ---------------------------------------------------------------------

  async createAccessPoint(
    schoolId: string,
    dto: CreateSchoolAccessPointDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SchoolAccessPointResponseDto> {
    await this.fetchOrThrow(schoolId, actor);
    const point = await this.accessPointRepository.create({ schoolId, ...dto });

    await this.recordAudit({
      companyId: actor.tenantId ?? undefined,
      entidadeId: schoolId,
      acao: "ACCESS_POINT_CREATED",
      atorUserId: actor.sub,
      dadosDepois: { pointId: point.id, nome: point.nome, tipo: point.tipo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSchoolAccessPointResponseDto(point);
  }

  async listAccessPoints(
    schoolId: string,
    actor: AuthenticatedUser,
  ): Promise<SchoolAccessPointResponseDto[]> {
    await this.fetchOrThrow(schoolId, actor);
    const points = await this.accessPointRepository.listBySchool(schoolId);
    return points.map(toSchoolAccessPointResponseDto);
  }

  async updateAccessPoint(
    schoolId: string,
    pointId: string,
    dto: UpdateSchoolAccessPointDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SchoolAccessPointResponseDto> {
    await this.fetchOrThrow(schoolId, actor);
    const point = await this.accessPointRepository.findById(pointId);
    if (!point || point.schoolId !== schoolId) {
      throw new NotFoundException("Ponto de acesso não encontrado.");
    }

    const updated = await this.accessPointRepository.update(pointId, dto);
    await this.recordAudit({
      companyId: actor.tenantId ?? undefined,
      entidadeId: schoolId,
      acao: "ACCESS_POINT_UPDATED",
      atorUserId: actor.sub,
      dadosDepois: { pointId, ...dto },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSchoolAccessPointResponseDto(updated);
  }

  async removeAccessPoint(
    schoolId: string,
    pointId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<void> {
    await this.fetchOrThrow(schoolId, actor);
    const point = await this.accessPointRepository.findById(pointId);
    if (!point || point.schoolId !== schoolId) {
      throw new NotFoundException("Ponto de acesso não encontrado.");
    }

    await this.accessPointRepository.delete(pointId);
    await this.recordAudit({
      companyId: actor.tenantId ?? undefined,
      entidadeId: schoolId,
      acao: "ACCESS_POINT_REMOVED",
      atorUserId: actor.sub,
      dadosAntes: { pointId, nome: point.nome },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  // ---------------------------------------------------------------------
  // Vínculo Empresa<->Escola (briefing "PERMISSÕES"/"ALUNOS")
  // ---------------------------------------------------------------------

  async linkCompany(
    schoolId: string,
    dto: CreateSchoolCompanyLinkDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SchoolCompanyLinkResponseDto> {
    await this.fetchOrThrow(schoolId, actor);

    const companyId = actor.role === Role.ADMIN_ROTTA ? dto.companyId : actor.tenantId;
    if (!companyId) {
      throw new BadRequestException("Informe `companyId` para vincular como Admin Rotta.");
    }

    const existing = await this.companyLinkRepository.findActiveByCompanyAndSchool(
      companyId,
      schoolId,
    );
    if (existing) {
      throw new ConflictException("Esta empresa já está vinculada a esta escola.");
    }

    const link = await this.companyLinkRepository.create({
      schoolId,
      companyId,
      vinculadoPorId: actor.sub,
    });

    await this.recordAudit({
      companyId,
      entidadeId: schoolId,
      acao: "COMPANY_LINKED",
      atorUserId: actor.sub,
      dadosDepois: { linkId: link.id, companyId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSchoolCompanyLinkResponseDto(link);
  }

  async unlinkCompany(
    schoolId: string,
    linkId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<void> {
    await this.fetchOrThrow(schoolId, actor);
    const link = await this.companyLinkRepository.encerra(linkId, actor.sub);

    await this.recordAudit({
      companyId: link.companyId,
      entidadeId: schoolId,
      acao: "COMPANY_UNLINKED",
      atorUserId: actor.sub,
      dadosAntes: { linkId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async listCompanyLinks(
    schoolId: string,
    actor: AuthenticatedUser,
  ): Promise<ListSchoolCompanyLinksResponseDto> {
    await this.fetchOrThrow(schoolId, actor);
    const links = await this.companyLinkRepository.findActiveForSchool(schoolId);
    return toListSchoolCompanyLinksResponseDto(links);
  }

  // ---------------------------------------------------------------------
  // Auditoria (briefing "AUDITORIA")
  // ---------------------------------------------------------------------

  async listAuditLogs(
    schoolId: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListAuditLogsResponseDto> {
    await this.fetchOrThrow(schoolId, actor);
    const result = await this.auditLogService.listByEntity(ENTIDADE_TIPO, schoolId, page, pageSize);
    return {
      items: result.items.map((log): AuditLogResponseDto => ({
        id: log.id,
        entidadeTipo: log.entidadeTipo,
        entidadeId: log.entidadeId,
        acao: log.acao,
        atorUserId: log.atorUserId,
        dadosAntes: log.dadosAntes,
        dadosDepois: log.dadosDepois,
        createdAt: log.createdAt,
      })),
      total: result.total,
      page,
      pageSize,
    };
  }
}
