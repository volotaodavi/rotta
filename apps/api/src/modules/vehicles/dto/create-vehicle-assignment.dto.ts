import { ApiProperty } from "@nestjs/swagger";
import { VehicleAssignmentRole } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";

/** Vínculo Veículo<->Motorista/Monitor (briefing "VINCULAÇÃO"). */
export class CreateVehicleAssignmentDto {
  @ApiProperty({ enum: VehicleAssignmentRole, example: VehicleAssignmentRole.MOTORISTA })
  @IsEnum(VehicleAssignmentRole)
  papel!: VehicleAssignmentRole;

  @ApiProperty({
    description: "userId do Motorista/Monitor (deve já ter Membership ativo na empresa)",
  })
  @IsUUID()
  userId!: string;
}
