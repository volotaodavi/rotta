import { ApiProperty } from "@nestjs/swagger";
import { VehicleReminderStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

/** Concluir/cancelar um lembrete (briefing "LEMBRETES"). */
export class UpdateVehicleReminderDto {
  @ApiProperty({ enum: VehicleReminderStatus, example: VehicleReminderStatus.CONCLUIDO })
  @IsEnum(VehicleReminderStatus)
  status!: VehicleReminderStatus;
}
