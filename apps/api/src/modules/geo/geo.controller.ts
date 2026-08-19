import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { InepSyncService } from "./agents/inep-sync.service";
import { MapIntelligenceService } from "./agents/map-intelligence.service";
import { GeocodeAddressDto } from "./dto/geocode-address.dto";
import { ListMapMarkersQueryDto } from "./dto/list-map-markers-query.dto";
import { ListNearbySchoolsQueryDto } from "./dto/list-nearby-schools-query.dto";
import { QuickRegisterSchoolDto } from "./dto/quick-register-school.dto";
import { RevisarCoordinateDto } from "./dto/revisar-coordinate.dto";
import { RoutePreviewDto } from "./dto/route-preview.dto";
import { GeoEngineService } from "./geo-engine.service";
import { GeoPipelineService } from "./geo-pipeline.service";
import {
  INEP_SYNC_QUEUE,
  SCHOOL_COORDINATE_REPOSITORY,
  SCHOOL_GEOCODE_QUEUE,
} from "./geo.constants";

import type { SchoolCoordinateRepository } from "./repositories/school-coordinate.repository";
import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { QstashPublisherService } from "@/infra/queue/qstash/qstash-publisher.service";
import { Role } from "@/shared/enums";

const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
/** Sincronizar com o Censo Escolar nacional é uma operação de escala/custo bem maior que gerenciar a própria base — só Admin Rotta dispara. */
const SYNC_ROLES = [Role.ADMIN_ROTTA] as const;
/** Ver marcadores no mapa é tão aberto quanto ver o catálogo de Escolas (`SchoolsController.READ_ROLES`). */
const VIEW_ROLES = [...MANAGE_ROLES, Role.MOTORISTA, Role.MONITOR, Role.RESPONSAVEL] as const;

function requestMeta(req: Request): { ip?: string; userAgent?: string } {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do Rotta Geo Engine/Geo Platform (briefing "ROTTA GEO
 * PLATFORM" §"API" — "Criar APIs REST completas. Versionadas. Swagger.
 * DTOs. Validações."): geocodificação de Escolas (Geocoding AI Agent +
 * Validation AI Agent) e a Fila de Revisão Manual (mesmas roles que já
 * gerenciam o catálogo de Escolas, `SchoolsController.MANAGE_ROLES`),
 * sincronização INEP/MEC (Education Sync Agent, só Admin Rotta) e
 * marcadores do mapa (Map Intelligence Agent, mesmas roles que já
 * enxergam o catálogo de Escolas, `SchoolsController.READ_ROLES`).
 */
@ApiTags("geo")
@ApiBearerAuth()
@Controller("geo")
export class GeoController {
  constructor(
    private readonly geoPipeline: GeoPipelineService,
    private readonly mapIntelligence: MapIntelligenceService,
    private readonly geoEngine: GeoEngineService,
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
    private readonly qstashPublisher: QstashPublisherService,
    private readonly inepSync: InepSyncService,
  ) {}

  @Post("schools/:schoolId/geocode")
  @Roles(...MANAGE_ROLES)
  geocodeSchool(@Param("schoolId", ParseUUIDPipe) schoolId: string) {
    return this.geoPipeline.geocodeSchool(schoolId);
  }

  @Get("schools/:schoolId/coordinates")
  @Roles(...MANAGE_ROLES)
  listSchoolCoordinates(@Param("schoolId", ParseUUIDPipe) schoolId: string) {
    return this.coordinateRepository.listBySchoolId(schoolId);
  }

  @Get("revisao-manual")
  @Roles(...MANAGE_ROLES)
  listRevisaoManual() {
    return this.coordinateRepository.listByStatus("REVISAO_MANUAL");
  }

  @Patch("coordinates/:id/revisar")
  @Roles(...MANAGE_ROLES)
  revisarCoordinate(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RevisarCoordinateDto) {
    return this.geoPipeline.resolveManualReview(id, dto);
  }

  /**
   * Reprocessa em lote toda a Fila de Revisão Manual atual (pedido do
   * usuário: "investigue e faça as IAs trabalharem") — publica um job
   * `SCHOOL_GEOCODE_QUEUE` por escola pendente, reaproveitando a MESMA
   * fila/`flowControl` que `InepSyncService.enfileirarGeocodificacao`
   * já usa pra respeitar a política pública do Nominatim (~1 req/seg):
   * o Geocoding/Validation AI Agent tentam de novo com a escada de
   * endereços cada vez mais simplificada (`buildAddressCandidate`),
   * que agora varia de verdade a cada tentativa em vez de repetir a
   * mesma pergunta. Escala/custo comparável à sincronização INEP (mesma
   * gating, `SYNC_ROLES`) — sempre `202 Accepted`, o volume pode levar
   * horas pra esvaziar contra o Nominatim público hospedado pela
   * comunidade, nunca cabe numa requisição HTTP síncrona.
   */
  @Post("revisao-manual/reprocessar")
  @Roles(...SYNC_ROLES)
  @HttpCode(HttpStatus.ACCEPTED)
  async reprocessarFilaRevisaoManual() {
    const pendentes = await this.coordinateRepository.listByStatus("REVISAO_MANUAL");
    const schoolIds = [...new Set(pendentes.map((coordenada) => coordenada.schoolId))];

    if (schoolIds.length > 0) {
      await this.qstashPublisher.publishBatchJSON(
        schoolIds.map((schoolId) => ({
          route: `geo/${SCHOOL_GEOCODE_QUEUE}`,
          body: { schoolId },
          options: {
            retries: 3,
            flowControlKey: SCHOOL_GEOCODE_QUEUE,
            flowControlParallelism: 1,
            flowControlRate: 1,
            flowControlPeriod: "1.1s",
          },
        })),
      );
    }

    return { enfileiradas: schoolIds.length };
  }

  /**
   * Education Sync Agent — publica a sincronização com o Censo Escolar
   * (INEP/MEC) do ano informado via QStash (`GeoQueueController.inepSyncJob`)
   * e responde `202 Accepted` imediatamente: o download+parse+diff de
   * ~200 mil linhas nunca cabe dentro do tempo de uma requisição HTTP
   * síncrona. O resultado (`InepSyncResumo`) fica registrado — ver
   * `GET inep-sync/status` logo abaixo — nunca só nos logs do "worker".
   */
  @Post("inep-sync")
  @Roles(...SYNC_ROLES)
  @HttpCode(HttpStatus.ACCEPTED)
  async sincronizarInep(@Query("ano", ParseIntPipe) ano: number) {
    const messageId = await this.qstashPublisher.publishJSON(
      `geo/${INEP_SYNC_QUEUE}`,
      { ano },
      { retries: 3, flowControlKey: INEP_SYNC_QUEUE, flowControlParallelism: 1 },
    );
    return { messageId, ano };
  }

  /**
   * Última execução da sincronização INEP (sucesso ou falha) — fecha o
   * gap descrito acima: antes de existir, o resultado do `POST
   * inep-sync` só aparecia nos logs do servidor, então ninguém sem
   * acesso ao Render sabia se a sincronização tinha funcionado. `null`
   * quando a sincronização nunca rodou neste ambiente (nem manual, nem
   * pelo cron automático).
   */
  @Get("inep-sync/status")
  @Roles(...SYNC_ROLES)
  getInepSyncStatus() {
    return this.inepSync.getStatus();
  }

  /** Map Intelligence Agent — marcadores de Escola dentro da janela visível do mapa. */
  @Get("mapa/marcadores")
  @Roles(...VIEW_ROLES)
  listarMarcadores(@Query() query: ListMapMarkersQueryDto) {
    return this.mapIntelligence.listarMarcadores(query);
  }

  /** Map Intelligence Agent — Escolas mais próximas de um ponto, ordenadas por distância. */
  @Get("mapa/proximas")
  @Roles(...VIEW_ROLES)
  listarProximas(@Query() query: ListNearbySchoolsQueryDto) {
    return this.mapIntelligence.listarProximas(
      { latitude: query.lat, longitude: query.lng },
      query.raioKm,
    );
  }

  /**
   * Endereço em texto livre → coordenada (Nominatim, via
   * `GeoEngineService.geocode`) — hoje usado pelo cadastro de Aluno pra
   * geocodificar o endereço de embarque digitado no formulário, mesmas
   * roles de quem já enxerga marcadores/escolas próximas.
   */
  @Post("geocode")
  @Roles(...VIEW_ROLES)
  geocodeEndereco(@Body() dto: GeocodeAddressDto) {
    return this.geoEngine.geocode(dto.endereco);
  }

  /**
   * Prévia de rota entre dois pontos (OSRM, via
   * `GeoEngineService.getRoute`) — mesma peça que faltava no cadastro
   * de Aluno pra desenhar o trajeto embarque → escola no formulário
   * (pedido do usuário em produção: "ele vai ver a rota traçada").
   * Não persiste nada — é só visualização, igual `geocode` acima.
   */
  @Post("rota-previa")
  @Roles(...VIEW_ROLES)
  rotaPrevia(@Body() dto: RoutePreviewDto) {
    return this.geoEngine.getRoute(dto.origem, dto.destino, dto.paradas ?? []);
  }

  /**
   * Autocadastro rápido de escola (Geocoding AI Agent) — pedido do
   * usuário: "não aparece escolas para clicar, nem busca rápida para
   * ver se a escola existe. Se existe agentes de IA, pq eles não estão
   * trabalhando?". Mesmas roles de quem já enxerga o catálogo de
   * Escolas (`VIEW_ROLES`, inclui Responsável) — a fila nacional do
   * Censo Escolar (`POST /geo/inep-sync`) continua existindo pra
   * completar o catálogo em massa, mas ninguém no meio do cadastro do
   * próprio filho deveria ficar esperando por ela.
   */
  @Post("schools/quick-register")
  @Roles(...VIEW_ROLES)
  quickRegisterSchool(
    @Body() dto: QuickRegisterSchoolDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.geoPipeline.quickRegisterSchool(dto, actor, requestMeta(req));
  }
}
