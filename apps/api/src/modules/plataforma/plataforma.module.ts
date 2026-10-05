import { Module } from "@nestjs/common";

import { PlataformaController } from "./plataforma.controller";
import { PulsoService } from "./pulso.service";

import { DiretoriaReadGuard } from "@/modules/client-errors/diretoria-read.guard";

/**
 * Sinais vitais da plataforma inteira, sem recorte de tenant.
 *
 * Mora fora dos módulos de domínio de propósito: ele conta trip,
 * posição, evento e conta de usuário ao mesmo tempo, e colocá-lo dentro
 * de qualquer um desses módulos faria esse módulo depender de todos os
 * outros por um motivo que não é dele.
 */
@Module({
  controllers: [PlataformaController],
  providers: [PulsoService, DiretoriaReadGuard],
  exports: [PulsoService],
})
export class PlataformaModule {}
