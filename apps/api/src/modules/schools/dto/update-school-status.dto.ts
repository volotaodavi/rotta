import { ApiProperty } from "@nestjs/swagger";
import { SchoolStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

/** Troca de status (briefing "STATUS") — endpoint dedicado, mesma convenção de `UpdateVehicleStatusDto`. */
export class UpdateSchoolStatusDto {
  @ApiProperty({ enum: SchoolStatus, example: SchoolStatus.ATIVA })
  @IsEnum(SchoolStatus)
  status!: SchoolStatus;
}
