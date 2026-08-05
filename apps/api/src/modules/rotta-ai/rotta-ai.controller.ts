import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AnalyzeSchoolAddressDto } from "./dto/analyze-school-address.dto";
import { AnalyzeVehicleDocumentDto } from "./dto/analyze-vehicle-document.dto";
import { ValidarContratoAssinadoDto } from "./dto/validar-contrato-assinado.dto";
import { ValidateDocumentResponseDto } from "./dto/validate-document-response.dto";
import { ValidateDocumentDto } from "./dto/validate-document.dto";
import { RottaAiService } from "./rotta-ai.service";

@ApiTags("rotta-ai")
@ApiBearerAuth()
@Controller("rotta-ai")
export class RottaAiController {
  constructor(private readonly rottaAiService: RottaAiService) {}

  @Post("validate-document")
  @ApiResponse({ status: 201, type: ValidateDocumentResponseDto })
  validateDocument(@Body() dto: ValidateDocumentDto) {
    return this.rottaAiService.validateDocument(dto);
  }

  @Post("analyze-vehicle-document")
  analyzeVehicleDocument(@Body() dto: AnalyzeVehicleDocumentDto) {
    return this.rottaAiService.analyzeVehicleDocument(dto);
  }

  @Post("analyze-school-address")
  analyzeSchoolAddress(@Body() dto: AnalyzeSchoolAddressDto) {
    return this.rottaAiService.analyzeSchoolAddress(dto);
  }

  @Post("validar-contrato-assinado")
  validarContratoAssinado(@Body() dto: ValidarContratoAssinadoDto) {
    return this.rottaAiService.validarContratoAssinado(dto);
  }
}
