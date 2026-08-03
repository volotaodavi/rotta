import { Module } from "@nestjs/common";


import { TRANSPORTER_REPOSITORY, TRANSPORT_REQUEST_REPOSITORY } from "./marketplace.constants";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { PrismaTransportRequestRepository } from "./repositories/prisma-transport-request.repository";
import { PrismaTransporterRepository } from "./repositories/prisma-transporter.repository";
import { TransportRequestsController } from "./transport-requests.controller";
import { TransportRequestsService } from "./transport-requests.service";

import { AuditModule } from "@/modules/audit/audit.module";
import { StudentsModule } from "@/modules/students/students.module";

/**
 * Módulo Marketplace (briefing "Marketplace") — descoberta/contratação
 * de transportadores pelo Responsável. Cobre BUSCA
 * (`MarketplaceService`) e SOLICITAÇÃO DE TRANSPORTE
 * (`TransportRequestsService`); contrato/Authentique e avaliações
 * chegam como serviços adicionais deste mesmo módulo, nunca como
 * módulos novos (todos operam sobre `TransportRequest`/`Contract`/
 * `Rating`, já modelados juntos no schema Prisma — ver `schema.prisma`,
 * seção "Marketplace"). Importa `StudentsModule` para o cadastro inline
 * de aluno na própria solicitação (briefing "SOLICITAR TRANSPORTE") —
 * sem risco de dependência circular, já que `StudentsModule`
 * deliberadamente NÃO importa `MarketplaceModule` de volta (ver nota em
 * `students.module.ts`).
 */
@Module({
  imports: [AuditModule, StudentsModule],
  controllers: [MarketplaceController, TransportRequestsController],
  providers: [
    MarketplaceService,
    TransportRequestsService,
    { provide: TRANSPORTER_REPOSITORY, useClass: PrismaTransporterRepository },
    { provide: TRANSPORT_REQUEST_REPOSITORY, useClass: PrismaTransportRequestRepository },
  ],
  exports: [MarketplaceService, TransportRequestsService],
})
export class MarketplaceModule {}
