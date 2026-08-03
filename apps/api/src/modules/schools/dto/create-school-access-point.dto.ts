import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolAccessPointType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from "class-validator";

/** Cadastro de portão/ponto de embarque-desembarque (briefing "PORTÕES E PONTOS DE EMBARQUE"). */
export class CreateSchoolAccessPointDto {
  @ApiProperty({ enum: SchoolAccessPointType, example: SchoolAccessPointType.PONTO_EMBARQUE })
  @IsEnum(SchoolAccessPointType)
  tipo!: SchoolAccessPointType;

  @ApiProperty({ example: "Portão dos Alunos" })
  @IsString()
  @MaxLength(120)
  nome!: string;

  @ApiPropertyOptional({ example: "Ao lado da quadra poliesportiva" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descricao?: string;

  @ApiProperty({ example: -23.561684 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.655981 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({
    example: "Evitar parar em frente ao portão entre 7h e 7h30 (fluxo de pais).",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
