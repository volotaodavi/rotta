import { Module } from "@nestjs/common";

import { TRANSPORTER_REPOSITORY } from "./marketplace.constants";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { PrismaTransporterRepository } from "./repositories/prisma-transporter.repository";

/**
 * Módulo Marketplace (briefing "Marketplace") — descoberta/contratação
 * de transportadores pelo Responsável. Esta primeira fatia cobre
 * somente a BUSCA (`MarketplaceService.search`/`findByIdOrThrow`);
 * solicitação de transporte, contrato e avaliações chegam como serviços
 * adicionais deste mesmo módulo, nunca como módulos novos (todos operam
 * sobre `TransportRequest`/`Contract`/`Rating`, já modelados juntos no
 * schema Prisma — ver `schema.prisma`, seção "Marketplace").
 */
@Module({
  controllers: [MarketplaceController],
  providers: [
    MarketplaceService,
    { provide: TRANSPORTER_REPOSITORY, useClass: PrismaTransporterRepository },
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
