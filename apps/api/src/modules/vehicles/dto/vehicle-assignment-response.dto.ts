import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleAssignmentRole } from "@prisma/client";

export class VehicleAssignmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty({ enum: VehicleAssignmentRole }) papel!: VehicleAssignmentRole;
  @ApiProperty() userId!: string;
  @ApiProperty() iniciadoEm!: Date;
  @ApiPropertyOptional() encerradoEm?: Date | null;
  @ApiProperty() criadoPorId!: string;
}
