import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthentiqueService } from "./authentique.service";
import { PrepararDocumentoAssinaturaDto } from "./dto/preparar-documento-assinatura.dto";

@ApiTags("authentique")
@ApiBearerAuth()
@Controller("authentique")
export class AuthentiqueController {
  constructor(private readonly authentiqueService: AuthentiqueService) {}

  @Post("preparar-documento")
  prepararDocumento(@Body() dto: PrepararDocumentoAssinaturaDto) {
    return this.authentiqueService.prepararDocumentoParaAssinatura(dto);
  }
}
