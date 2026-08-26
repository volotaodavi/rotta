import { Module } from "@nestjs/common";

import { GroqService } from "./groq.service";

/**
 * Groq (Frente 5 — IA de suporte). Ver `groq.service.ts`/`groq.config.ts`.
 */
@Module({
  providers: [GroqService],
  exports: [GroqService],
})
export class GroqModule {}
