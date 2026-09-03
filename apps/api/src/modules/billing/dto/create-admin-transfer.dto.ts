import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

/**
 * `POST /billing/admin/transfers` (Frente 33, pedido do usuário
 * 03/09/2026 — "fazer transferências") — SEMPRE Pix por chave nesta
 * entrega. Nunca decorada com `@AdminAreas` no controller: por design
 * do `AdminAreaGuard`, isso deixa o endpoint GERAL-only por padrão —
 * `AdminRottaPapel.FINANCEIRO` nunca pode transferir, só ver saldo/
 * extrato (`RN` implícita do pedido do usuário: papel Financeiro "sem
 * conseguir fazer transferências").
 */
export class CreateAdminTransferDto {
  @ApiProperty({ description: "Valor a transferir, em centavos.", example: 10000 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  valorCentavos!: number;

  @ApiProperty({ description: "Chave Pix de destino." })
  @IsString()
  @MaxLength(200)
  chavePix!: string;

  @ApiProperty({ enum: ["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"] })
  @IsIn(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"])
  tipoChavePix!: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

  @ApiPropertyOptional({ description: "Descrição/motivo da transferência, opcional." })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descricao?: string;
}
