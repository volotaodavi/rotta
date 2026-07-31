import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { RedisConfig } from "@/config/redis.config";

/**
 * Modulo de filas (BullMQ/Redis, Dossie 14). Registra apenas a conexao
 * raiz — o registro de cada fila individual (`QUEUE_NAMES`) e dos
 * respectivos processors acontece em `apps/worker` quando os jobs reais
 * forem implementados (fase de fundacao: apenas a infraestrutura).
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>("redis");
        const url = new URL(redisConfig?.url ?? "redis://localhost:6379");

        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
