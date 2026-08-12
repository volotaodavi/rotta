import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

/**
 * Nova versão RASCUNHO de um documento — `versao`/`status`/`autorId`
 * nunca vêm do cliente (o service calcula/preenche a partir do maior
 * `versao` existente e de `actor.sub`).
 */
export class CreateLegalDocumentVersionDto {
  @ApiProperty({ example: "# Termos de Uso\n\n..." })
  @IsString()
  @MinLength(1)
  conteudoMarkdown!: string;
}
