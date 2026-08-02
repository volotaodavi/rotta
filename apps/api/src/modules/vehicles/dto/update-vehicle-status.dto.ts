import { ApiProperty } from "@nestjs/swagger";
import { VehicleStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

/** Transição explícita de status (briefing "STATUS") — nunca inferida por efeito colateral de outro módulo. */
export class UpdateVehicleStatusDto {
  @ApiProperty({ enum: VehicleStatus, example: VehicleStatus.MANUTENCAO })
  @IsEnum(VehicleStatus)
  status!: VehicleStatus;
}
