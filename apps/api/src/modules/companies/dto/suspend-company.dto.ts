import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SuspendCompanyDto {
  @ApiProperty({ example: "Inadimplência acima de 30 dias" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo!: string;
}
