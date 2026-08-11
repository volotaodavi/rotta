import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { IntegrationHealthSnapshot } from "@/infra/observability/integration-health.service";

import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { RedisService } from "@/infra/cache/redis.service";
import { PrismaService } from "@/infra/database/prisma.service";
import { IntegrationHealthService } from "@/infra/observability/integration-health.service";
import { ABACATEPAY_INTEGRATION_NAME } from "@/modules/billing/abacatepay-client.service";
import {
  NOMINATIM_INTEGRATION_NAME,
  OSRM_INTEGRATION_NAME,
} from "@/modules/geo/geo-engine.service";
import { LYTEX_INTEGRATION_NAME } from "@/modules/wallet/rotta-pay-provider.service";
import { Role } from "@/shared/enums";

/** As 3 integrações externas explicitamente citadas como exemplo pelo PROMPT — ROTTA INTEGRATION & INTELLIGENCE AUDIT ENGINE (Seção 34: "LYTEX... ABACATEPAY... GEO PROVIDER") — únicas com instrumentação real de saúde até esta entrega (Dossiê 44). */
const TRACKED_INTEGRATIONS = [
  ABACATEPAY_INTEGRATION_NAME,
  LYTEX_INTEGRATION_NAME,
  NOMINATIM_INTEGRATION_NAME,
  OSRM_INTEGRATION_NAME,
];

interface HealthScore {
  /** 0 a 100 — só considera componentes com evidência real (exclui `not_configured`/`unknown`, ver `note`). */
  value: number;
  consideredComponents: number;
  healthyComponents: number;
  note: string;
}

interface IntegrationsHealthResponse {
  status: "ok" | "degraded" | "down";
  database: boolean;
  cache: boolean;
  integrations: IntegrationHealthSnapshot[];
  score: HealthScore;
}

/** Peso de cada nível de integração no cálculo do score — `not_configured`/`unknown` NUNCA entram no denominador (ver `computeScore`). */
const INTEGRATION_WEIGHT: Record<string, number> = {
  healthy: 1,
  degraded: 0.5,
  down: 0,
};

function computeScore(
  database: boolean,
  cache: boolean,
  integrations: IntegrationHealthSnapshot[],
): HealthScore {
  const consideredIntegrations = integrations.filter(
    (snapshot) =>
      snapshot.status === "healthy" || snapshot.status === "degraded" || snapshot.status === "down",
  );

  const points =
    (database ? 1 : 0) +
    (cache ? 1 : 0) +
    consideredIntegrations.reduce(
      (sum, snapshot) => sum + (INTEGRATION_WEIGHT[snapshot.status] ?? 0),
      0,
    );
  const consideredComponents = 2 + consideredIntegrations.length;
  const healthyComponents =
    (database ? 1 : 0) +
    (cache ? 1 : 0) +
    consideredIntegrations.filter((s) => s.status === "healthy").length;

  const excluded = integrations.length - consideredIntegrations.length;
  const note =
    excluded > 0
      ? `${excluded} integração(ões) excluída(s) do score por ainda não terem sido chamadas (unknown) ou não estarem configuradas neste ambiente (not_configured) — ver campo "integrations" para o detalhe de cada uma.`
      : "Score calculado sobre todos os componentes monitorados (Postgres, Redis e integrações com pelo menos uma chamada real registrada).";

  return {
    value: consideredComponents === 0 ? 100 : Math.round((points / consideredComponents) * 100),
    consideredComponents,
    healthyComponents,
    note,
  };
}

/**
 * Health checks (Dossie 12, Secao 10.1) — consumidos pelo orquestrador
 * de containers (Docker/CI) para decidir reinicio e roteamento de
 * trafego. Nao e um modulo de negocio (fora da lista do Dossie 13).
 *
 * `GET /health/integrations` (Dossiê 44 — PROMPT ROTTA INTEGRATION &
 * INTELLIGENCE AUDIT ENGINE, Seção 34/35) é DIFERENTE de `/health/ready`:
 * não dispara nenhuma chamada nova, só lê o histórico real acumulado por
 * `IntegrationHealthService` a partir do tráfego de produção — responde
 * "essa integração está falhando na prática?", não "ela respondeu a um
 * ping artificial agora?". Exclusivo de `Role.ADMIN_ROTTA`: expõe
 * detalhe operacional (últimos erros, latência) que não deve vazar para
 * fora da equipe da Rotta.
 */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly integrationHealth: IntegrationHealthService,
  ) {}

  /** Liveness — o processo esta de pe. */
  @Public()
  @Get()
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  /** Readiness — o processo esta pronto para trafego (Postgres/Redis alcancaveis). */
  @Public()
  @Get("ready")
  async readiness(): Promise<{ status: "ok" | "degraded"; database: boolean; cache: boolean }> {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

    const cache = await this.redis
      .set("health:ping", "1", 5)
      .then(() => true)
      .catch(() => false);

    return { status: database && cache ? "ok" : "degraded", database, cache };
  }

  /** Painel do Admin Rotta ("Rotta Control Center", Dossiê 44) — saúde real acumulada de Postgres/Redis/integrações externas. */
  @ApiBearerAuth()
  @Roles(Role.ADMIN_ROTTA)
  @Get("integrations")
  async integrations(): Promise<IntegrationsHealthResponse> {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    const cache = await this.redis
      .set("health:ping", "1", 5)
      .then(() => true)
      .catch(() => false);
    const integrationSnapshots = await this.integrationHealth.getAllSnapshots(TRACKED_INTEGRATIONS);

    const hasDown =
      !database || !cache || integrationSnapshots.some((snapshot) => snapshot.status === "down");
    const hasDegraded = integrationSnapshots.some((snapshot) => snapshot.status === "degraded");

    return {
      status: hasDown ? "down" : hasDegraded ? "degraded" : "ok",
      database,
      cache,
      integrations: integrationSnapshots,
      score: computeScore(database, cache, integrationSnapshots),
    };
  }
}
