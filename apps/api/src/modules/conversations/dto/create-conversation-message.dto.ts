import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** Nova mensagem no chat do Contrato (Frente 10(d)) — "mensagem não pode ser vazia", mesma regra de `CreateSupportMessageDto`. */
export class CreateConversationMessageDto {
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  mensagem!: string;
}
