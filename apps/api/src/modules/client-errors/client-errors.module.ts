import { Module } from "@nestjs/common";

import { ClientErrorsController } from "./client-errors.controller";
import { ClientErrorsService } from "./client-errors.service";
import { DiretoriaReadGuard } from "./diretoria-read.guard";
import { CLIENT_ERROR_REPORT_REPOSITORY } from "./repositories/client-error-report.repository";
import { PrismaClientErrorReportRepository } from "./repositories/prisma-client-error-report.repository";

import { AuthModule } from "@/modules/auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [ClientErrorsController],
  providers: [
    DiretoriaReadGuard,
    ClientErrorsService,
    { provide: CLIENT_ERROR_REPORT_REPOSITORY, useClass: PrismaClientErrorReportRepository },
  ],
})
export class ClientErrorsModule {}
