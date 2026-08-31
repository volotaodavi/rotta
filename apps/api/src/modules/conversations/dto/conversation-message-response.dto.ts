import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Forma de resposta pública de `ConversationMessage`. */
export class ConversationMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty() autorUserId!: string;
  @ApiProperty({ example: "Maria Souza" }) autorNome!: string;
  @ApiProperty({ example: "RESPONSAVEL", enum: ["RESPONSAVEL", "MOTORISTA", "MONITOR"] })
  autorRole!: string;
  /** `true` quando a mensagem é de quem está lendo agora (pra alinhar o balão à direita no chat, mesmo padrão de qualquer chat 1:1). */
  @ApiProperty() souEu!: boolean;
  @ApiProperty() mensagem!: string;
  @ApiPropertyOptional({ nullable: true }) lidaEm!: Date | null;
  @ApiProperty() createdAt!: Date;
}
