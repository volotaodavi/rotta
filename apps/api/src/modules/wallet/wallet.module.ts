import { Module } from "@nestjs/common";


import { PrismaWalletRepository } from "./repositories/prisma-wallet.repository";
import { RottaPayProviderService } from "./rotta-pay-provider.service";
import { WALLET_REPOSITORY } from "./wallet.constants";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";

import { AuditModule } from "@/modules/audit/audit.module";

/**
 * Módulo Rotta Pay (Dossiê 26) — carteira/ledger/saques de Empresas e
 * Motoristas. Exporta `WalletService` para `MarketplaceModule` chamar
 * `registrarMensalidadePendente` na ativação de um `Contract` (Dossiê
 * 26, Seção 6) sem precisar reimportar nada além disso.
 */
@Module({
  imports: [AuditModule],
  controllers: [WalletController],
  providers: [
    WalletService,
    RottaPayProviderService,
    { provide: WALLET_REPOSITORY, useClass: PrismaWalletRepository },
  ],
  exports: [WalletService],
})
export class WalletModule {}
