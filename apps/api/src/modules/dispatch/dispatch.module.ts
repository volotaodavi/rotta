import { Module } from "@nestjs/common";

import { DISPATCH_REPOSITORY } from "./dispatch.constants";
import { DispatchController } from "./dispatch.controller";
import { DispatchService } from "./dispatch.service";
import { PrismaDispatchRepository } from "./repositories/prisma-dispatch.repository";

/**
 * Painel Geral do Despachante.
 *
 * Nenhum `imports:`, e isso não é descuido. O módulo lê sete consultas
 * de `PrismaService`, que é `@Global()`, e `ConfigService`, idem.
 * Importar `TripsModule` para reusar `listActiveForMap` traria junto
 * `StudentsModule`, `VehiclesModule` e `RottaAiModule -> GeoModule`
 * inteiros, para no fim devolver menos do que o painel precisa: a
 * resposta daquele mapa não tem número de frota, não tem velocidade e
 * não distingue carro sem sinal de carro sem rastreador.
 */
@Module({
  controllers: [DispatchController],
  providers: [
    DispatchService,
    { provide: DISPATCH_REPOSITORY, useClass: PrismaDispatchRepository },
  ],
  exports: [DispatchService],
})
export class DispatchModule {}
