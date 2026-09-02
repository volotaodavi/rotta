import { Module } from "@nestjs/common";

import { SupportAiService } from "./support-ai.service";

/**
 * IA de suporte (Frente 5). Ver `support-ai.service.ts`/`support-ai.config.ts`.
 */
@Module({
  providers: [SupportAiService],
  exports: [SupportAiService],
})
export class SupportAiModule {}
