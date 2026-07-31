import { Global, Module } from "@nestjs/common";

import { RedisService } from "./redis.service";

/** Modulo global de cache (Dossie 12, Secao 8). */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
