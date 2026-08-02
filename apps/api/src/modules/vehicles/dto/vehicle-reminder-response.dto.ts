import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleReminderStatus, VehicleReminderType } from "@prisma/client";

export class VehicleReminderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty({ enum: VehicleReminderType }) tipo!: VehicleReminderType;
  @ApiProperty() dataAlvo!: Date;
  @ApiPropertyOptional() quilometragemAlvo?: number | null;
  @ApiProperty({ enum: VehicleReminderStatus }) status!: VehicleReminderStatus;
  @ApiPropertyOptional() observacoes?: string | null;
  @ApiProperty({ description: "true quando a data-alvo já passou" }) vencido!: boolean;
  @ApiProperty({ description: "true quando a data-alvo está a até 15 dias" }) vencendo!: boolean;
  @ApiProperty() createdAt!: Date;
}
