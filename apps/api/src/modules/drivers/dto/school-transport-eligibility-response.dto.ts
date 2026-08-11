import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import type { SchoolTransportEligibilityStatus } from "../school-transport-eligibility.util";

const STATUS_VALUES: SchoolTransportEligibilityStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "ELIGIBLE",
  "NOT_ELIGIBLE",
  "EXPIRED",
  "REQUIRES_UPDATE",
];

class RequisitosVerificadosDto {
  @ApiProperty() cnhCategoriaValida!: boolean;
  @ApiProperty() ear!: boolean;
  @ApiProperty() cursoTransporteEscolar!: boolean;
  @ApiProperty() antecedentesCriminais!: boolean;
}

/** Espelha `SchoolTransportEligibilityResult` (Dossiê 45) — nunca `"VERIFICADO"` genérico, sempre com a finalidade explícita no nome do campo/endpoint. */
export class SchoolTransportEligibilityResponseDto {
  @ApiProperty({ enum: STATUS_VALUES }) status!: SchoolTransportEligibilityStatus;
  @ApiProperty() motivo!: string;
  @ApiPropertyOptional() categoriaCnh!: string | null;
  @ApiProperty({ type: RequisitosVerificadosDto }) requisitosVerificados!: RequisitosVerificadosDto;
}
