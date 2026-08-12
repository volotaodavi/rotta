import { Module } from "@nestjs/common";

import { ReceitaFederalService } from "./receita-federal.service";

@Module({
  providers: [ReceitaFederalService],
  exports: [ReceitaFederalService],
})
export class ReceitaFederalModule {}
