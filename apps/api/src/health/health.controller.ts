import { Controller, Get } from "@nestjs/common";

import { Public } from "@/common/decorators/public.decorator";
import { RedisService } from "@/infra/cache/redis.service";
import { PrismaService } from "@/infra/database/prisma.service";

/**
 * Health checks (Dossie 12, Secao 10.1) — consumidos pelo orquestrador
 * de containers (Docker/CI) para decidir reinicio e roteamento de
 * trafego. Nao e um modulo de negocio (fora da lista do Dossie 13).
 */
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
}
