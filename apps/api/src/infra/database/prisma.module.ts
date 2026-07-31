import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

/**
 * Modulo global do Prisma — importado uma unica vez em `app.module.ts`,
 * disponivel para injecao em qualquer modulo sem reimportar (Dossie 12,
 * Secao 6).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
