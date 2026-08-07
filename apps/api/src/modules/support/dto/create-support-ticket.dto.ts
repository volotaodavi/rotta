import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SupportTicketCategoria } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl, MinLength } from "class-validator";

/** Abertura de chamado (`SUP-01`) — "assunto e descrição obrigatórios; anexo com limite de tamanho". */
export class CreateSupportTicketDto {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  assunto!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  descricao!: string;

  @ApiProperty({ enum: SupportTicketCategoria, example: SupportTicketCategoria.DUVIDA })
  @IsEnum(SupportTicketCategoria)
  categoria!: SupportTicketCategoria;

  @ApiPropertyOptional({
    description:
      "URL do anexo, já enviado via upload prévio (mesmo padrão de storage dos demais módulos)",
  })
  @IsOptional()
  @IsUrl()
  anexoUrl?: string;
}
