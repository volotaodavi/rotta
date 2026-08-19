import { ApiProperty } from "@nestjs/swagger";
import { SchoolStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

/**
 * Troca de status EM MASSA (pedido do usuário: "as escolas que
 * estiverem com o status de 'em análise', passe todas as escolas para
 * 'ativa'") — só `Role.ADMIN_ROTTA` (catálogo nacional compartilhado,
 * não uma ação de uma Empresa sobre as próprias escolas).
 */
export class BulkUpdateSchoolStatusDto {
  @ApiProperty({ enum: SchoolStatus, example: SchoolStatus.EM_ANALISE })
  @IsEnum(SchoolStatus)
  fromStatus!: SchoolStatus;

  @ApiProperty({ enum: SchoolStatus, example: SchoolStatus.ATIVA })
  @IsEnum(SchoolStatus)
  toStatus!: SchoolStatus;
}
