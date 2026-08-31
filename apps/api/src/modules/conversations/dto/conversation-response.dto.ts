import { ApiProperty } from "@nestjs/swagger";

/** Forma de resposta pública de `Conversation` — envelope leve, o conteúdo é a lista paginada de `ConversationMessageResponseDto`. */
export class ConversationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() contractId!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  /** Quantas mensagens do outro lado ainda não foram lidas por quem está consultando — pro badge de "não lida" na lista de conversas. */
  @ApiProperty() naoLidas!: number;
}
