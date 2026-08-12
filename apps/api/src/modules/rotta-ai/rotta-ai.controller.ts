import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AnalyzeSchoolAddressDto } from "./dto/analyze-school-address.dto";
import { AnalyzeVehicleDocumentDto } from "./dto/analyze-vehicle-document.dto";
import { RouteOptimizationResponseDto } from "./dto/route-optimization-response.dto";
import { SuggestRouteOptimizationDto } from "./dto/suggest-route-optimization.dto";
import { ValidarContratoAssinadoDto } from "./dto/validar-contrato-assinado.dto";
import { ValidateDocumentResponseDto } from "./dto/validate-document-response.dto";
import { ValidateDocumentDto } from "./dto/validate-document.dto";
import { VehicleDocumentAnalysisResponseDto } from "./dto/vehicle-document-analysis-response.dto";
import { RottaAiService } from "./rotta-ai.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";

@ApiTags("rotta-ai")
@ApiBearerAuth()
@Controller("rotta-ai")
export class RottaAiController {
  constructor(private readonly rottaAiService: RottaAiService) {}

  @Post("validate-document")
  @ApiResponse({ status: 201, type: ValidateDocumentResponseDto })
  validateDocument(@Body() dto: ValidateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    // Usa o papel de QUEM ESTÁ LOGADO como o papel do titular do
    // documento — correto para o caso comum (o próprio Motorista
    // enviando sua CNH). Ainda não cobre "ajudante cadastrando o
    // motorista" (um Gestor enviando o documento do motorista): sem um
    // Drivers module (Dossiê 13, Seção 5 — hoje um stub vazio) para
    // apontar de quem é o documento, não há como distinguir os dois
    // casos aqui. Quando esse módulo existir, este parâmetro passa a
    // vir de `motoristaId`/papel do titular resolvido no banco, nunca
    // do usuário autenticado.
    return this.rottaAiService.validateDocument(dto, user.role);
  }

  @Post("analyze-vehicle-document")
  @ApiResponse({ status: 201, type: VehicleDocumentAnalysisResponseDto })
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

  @Post("suggest-route-optimization")
  @ApiResponse({ status: 201, type: RouteOptimizationResponseDto })
  suggestRouteOptimization(
    @Body() dto: SuggestRouteOptimizationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rottaAiService.suggestRouteOptimization(dto, actor);
  }
}
