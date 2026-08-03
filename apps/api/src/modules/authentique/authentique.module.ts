import { Module } from "@nestjs/common";

import { AuthentiqueController } from "./authentique.controller";
import { AuthentiqueService } from "./authentique.service";

@Module({
  controllers: [AuthentiqueController],
  providers: [AuthentiqueService],
  exports: [AuthentiqueService],
})
export class AuthentiqueModule {}
