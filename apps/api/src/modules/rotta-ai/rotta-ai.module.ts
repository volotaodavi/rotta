import { Module } from "@nestjs/common";

import { RottaAiController } from "./rotta-ai.controller";
import { RottaAiService } from "./rotta-ai.service";

@Module({
  controllers: [RottaAiController],
  providers: [RottaAiService],
  exports: [RottaAiService],
})
export class RottaAiModule {}
