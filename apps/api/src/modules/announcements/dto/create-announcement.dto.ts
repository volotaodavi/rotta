import { ApiProperty } from "@nestjs/swagger";
import { AnnouncementAudience } from "@prisma/client";
import { IsEnum, IsString, MinLength } from "class-validator";

/** Publicação de um aviso/comunicado geral pelo Admin Rotta (pedido do usuário: "aba de criação de avisos, comunicados e notificações gerais"). */
export class CreateAnnouncementDto {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  titulo!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  corpo!: string;

  @ApiProperty({ enum: AnnouncementAudience, example: AnnouncementAudience.TODOS })
  @IsEnum(AnnouncementAudience)
  publico!: AnnouncementAudience;
}
