import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID, Matches } from "class-validator";

/**
 * Parâmetros da exportação para o SETE.
 *
 * Entrada de fora, então `class-validator` como todo o resto da API —
 * os contratos de `@rotta/shared-contracts` são de SAÍDA.
 */
export class ExportarSeteQueryDto {
  @ApiProperty({
    description: "Código IBGE do município (7 dígitos). O de Maricá é 3302700.",
    example: "3302700",
  })
  // Sete dígitos exatos: o SETE casa o município por este número, e um
  // código com seis ou oito dígitos não é erro de digitação, é outro
  // município ou nenhum.
  @Matches(/^\d{7}$/, { message: "O código IBGE tem 7 dígitos. O de Maricá é 3302700." })
  codigoIbge!: string;

  @ApiPropertyOptional({ enum: ["json", "csv"], default: "json" })
  @IsOptional()
  @IsIn(["json", "csv"], { message: "O formato é json ou csv." })
  formato?: "json" | "csv";

  @ApiPropertyOptional({
    description:
      "De qual transportadora é a exportação. Só o Admin Rotta pode informar: " +
      "para Empresa e Gestor o escopo vem sempre do token, nunca da URL.",
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
