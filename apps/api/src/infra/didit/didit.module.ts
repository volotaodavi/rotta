import { Module } from "@nestjs/common";

import { DiditService } from "./didit.service";

@Module({
  providers: [DiditService],
  exports: [DiditService],
})
export class DiditModule {}
