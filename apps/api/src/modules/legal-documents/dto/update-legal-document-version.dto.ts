import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Edição de conteúdo — só permitida enquanto a versão está em RASCUNHO (`LegalDocumentsService.updateVersion`). */
export class UpdateLegalDocumentVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  conteudoMarkdown?: string;

  @ApiPropertyOptional({ example: "Ajusta a seção de GPS após achado C1 da auditoria" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changelog?: string;
}
