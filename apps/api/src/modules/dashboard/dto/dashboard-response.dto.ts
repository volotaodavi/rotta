import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TripCountersResponseDto {
  @ApiProperty() total!: number;
  @ApiProperty() emAndamento!: number;
  @ApiProperty() concluidas!: number;
  @ApiProperty() canceladas!: number;
}

/** Dashboard de Motorista/Monitor — a própria escala do dia + conformidade documental. */
export class DriverDashboardResponseDto {
  @ApiProperty({ type: TripCountersResponseDto }) viagensHoje!: TripCountersResponseDto;
  @ApiProperty() documentosPendentesAnaliseIa!: number;
  @ApiProperty() documentosVencendoEm30Dias!: number;
}

/** Dashboard de Responsável — sem tenant (Dossiê 8 §2), escopado à própria pessoa. */
export class ResponsavelDashboardResponseDto {
  @ApiProperty() filhosTotal!: number;
  @ApiProperty() contratosAtivos!: number;
  @ApiProperty() contratosTotal!: number;
}

/**
 * Envelope único do `GET /dashboard/me` — o `perfil` indica qual dos
 * dois sub-objetos vem preenchido (nunca mais de um). Empresa/Gestor
 * usam `GET /companies/:id/dashboard` (Dossiê 16/30 §3.1); Admin Rotta
 * usa `GET /backoffice/dashboard` (Dossiê 29) + `GET /analytics/national/kpis`
 * (Dossiê 30) — ver `DashboardController`.
 */
export class DashboardResponseDto {
  @ApiProperty({ enum: ["motorista", "responsavel"] })
  perfil!: "motorista" | "responsavel";

  @ApiPropertyOptional({ type: DriverDashboardResponseDto })
  motorista?: DriverDashboardResponseDto;

  @ApiPropertyOptional({ type: ResponsavelDashboardResponseDto })
  responsavel?: ResponsavelDashboardResponseDto;
}
