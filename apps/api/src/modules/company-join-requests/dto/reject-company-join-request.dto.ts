import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectCompanyJoinRequestDto {
  @ApiPropertyOptional({ example: "Não reconhecemos esse motorista na equipe." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
