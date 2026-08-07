import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

/**
 * `ADM-01`: "Acessar como suporte" — "exige justificativa textual
 * registrada antes de ser concedida". `RN-10`: todo acesso do Admin
 * Rotta a dado de um tenant gera log de auditoria imutável, inclusive
 * leitura.
 */
export class AccessAsSupportDto {
  @ApiProperty({
    minLength: 10,
    description: "Justificativa obrigatória — registrada no log de auditoria",
  })
  @IsString()
  @MinLength(10)
  motivo!: string;
}
