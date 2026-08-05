import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsString, Length, Min } from "class-validator";

/** Solicitação de saque — sempre da PRÓPRIA carteira do ator autenticado (Dossiê 26, Seção 3). */
export class RequestWithdrawalDto {
  @ApiProperty({ example: 5000, description: "Valor do saque, em centavos" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  valorCentavos!: number;

  @ApiProperty({
    example: "11999998888",
    description:
      "Chave PIX (CPF/CNPJ/e-mail/telefone/aleatória) — a Rotta não valida o formato específico, só presença.",
  })
  @IsString()
  @Length(1, 140)
  chavePix!: string;
}
