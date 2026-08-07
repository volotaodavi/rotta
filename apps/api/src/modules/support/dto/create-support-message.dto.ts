import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl, MinLength } from "class-validator";

/** Nova mensagem em um chamado (`SUP-02`) — "mensagem não pode ser vazia". */
export class CreateSupportMessageDto {
  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  mensagem!: string;

  @ApiPropertyOptional({ description: "Anexo adicional durante a conversa (ex. print de erro)" })
  @IsOptional()
  @IsUrl()
  anexoUrl?: string;
}
