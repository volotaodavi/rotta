import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength } from "class-validator";

/**
 * Novo documento no catálogo do CMS (raro — os 10 documentos reais já
 * existem em `apps/web/src/features/legal/documents.ts`; isto é para
 * quando um documento novo nascer). `slug` correlaciona manualmente com
 * `LegalDocumentMeta.slug` do lado público — ver comentário em cima de
 * `model LegalDocument`, `schema.prisma`.
 */
export class CreateLegalDocumentDto {
  @ApiProperty({ example: "termos" })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug deve conter apenas letras minúsculas, números e hífen",
  })
  slug!: string;

  @ApiProperty({ example: "Termos de Uso" })
  @IsString()
  @MaxLength(200)
  titulo!: string;
}
