import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { RedisConfig } from "@/config/redis.config";

/**
 * Wrapper de cache sobre o cliente Redis (Dossie 12, Secao 8) — nenhum
 * modulo de negocio chama o cliente Redis diretamente; todos consomem
 * esta interface via injecao de dependencia (mesmo motivo do Repository
 * Pattern, Dossie 12 Secao 6.1: testabilidade e possibilidade de trocar
 * a implementacao sem tocar em regra de negocio).
 *
 * Toda chave segue o padrao `{contexto}:{tenant_id}:{identificador}`
 * (Dossie 12, Secao 8) — a disciplina de nomear a chave corretamente e
 * responsabilidade de quem chama, nao deste service.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    const redisConfig = configService.get<RedisConfig>("redis");
    this.client = new Redis(redisConfig?.url ?? "");
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, serialized, "EX", ttlSeconds);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async invalidate(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getOrSet<T>(key: string, ttlSeconds: number, resolver: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await resolver();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
