import { Module } from "@nestjs/common";


import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import {
  CONTRACT_REPOSITORY,
  TRANSPORTER_REPOSITORY,
  TRANSPORT_REQUEST_REPOSITORY,
} from "./marketplace.constants";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { PrismaContractRepository } from "./repositories/prisma-contract.repository";
import { PrismaTransportRequestRepository } from "./repositories/prisma-transport-request.repository";
import { PrismaTransporterRepository } from "./repositories/prisma-transporter.repository";
import { TransportRequestsController } from "./transport-requests.controller";
import { TransportRequestsService } from "./transport-requests.service";

import { AuditModule } from "@/modules/audit/audit.module";
import { AuthentiqueModule } from "@/modules/authentique/authentique.module";
import { StudentsModule } from "@/modules/students/students.module";

/**
 * Módulo Marketplace (briefing "Marketplace") — descoberta/contratação
 * de transportadores pelo Responsável. Cobre BUSCA (`MarketplaceService`),
 * SOLICITAÇÃO DE TRANSPORTE (`TransportRequestsService`) e
 * GERAÇÃO/ASSINATURA DE CONTRATO (`ContractsService`, com
 * `AuthentiqueModule` para a preparação do documento — stub honesto);
 * ativação automática pós-assinatura e avaliações chegam como serviços
 * adicionais deste mesmo módulo, nunca como módulos novos (todos operam
 * sobre `TransportRequest`/`Contract`/`Rating`, já modelados juntos no
 * schema Prisma — ver `schema.prisma`, seção "Marketplace"). Importa
 * `StudentsModule` para o cadastro inline de aluno na própria
 * solicitação (briefing "SOLICITAR TRANSPORTE") — sem risco de
 * dependência circular, já que `StudentsModule` deliberadamente NÃO
 * importa `MarketplaceModule` de volta (ver nota em `students.module.ts`).
 */
@Module({
  imports: [AuditModule, StudentsModule, AuthentiqueModule],
  controllers: [MarketplaceController, TransportRequestsController, ContractsController],
  providers: [
    MarketplaceService,
    TransportRequestsService,
    ContractsService,
    { provide: TRANSPORTER_REPOSITORY, useClass: PrismaTransporterRepository },
    { provide: TRANSPORT_REQUEST_REPOSITORY, useClass: PrismaTransportRequestRepository },
    { provide: CONTRACT_REPOSITORY, useClass: PrismaContractRepository },
  ],
  exports: [MarketplaceService, TransportRequestsService, ContractsService],
})
export class MarketplaceModule {}
