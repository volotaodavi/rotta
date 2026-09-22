import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumberString, IsOptional, Length } from "class-validator";

/**
 * Credenciamento inicial do rastreador num ônibus (pedido do usuário
 * 22/09/2026: "o credenciamento inicial — configuração do rastreador —
 * deverá partir daqui + admin").
 *
 * `imei` ausente ou vazio DESVINCULA o aparelho deste ônibus — é como o
 * rastreador é movido de um carro para outro: tira daqui, põe lá.
 */
export class CredenciarRastreadorDto {
  @ApiPropertyOptional({
    example: "863719060123456",
    description:
      "IMEI do rastreador (14 a 17 dígitos). Omitir ou mandar vazio desvincula o aparelho deste ônibus.",
  })
  @IsOptional()
  @IsNumberString({ no_symbols: true }, { message: "O IMEI é só dígitos." })
  @Length(14, 17)
  imei?: string;
}
