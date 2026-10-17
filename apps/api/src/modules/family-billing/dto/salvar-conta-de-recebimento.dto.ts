import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/**
 * Para onde o transportador quer receber o repasse das mensalidades.
 *
 * Só a chave Pix entra por aqui. `asaasWalletId` (o destino do split) e
 * `taxaDaPlataformaBps` (a comissão) são decisões da Rotta, não do
 * cliente: um transportador que pudesse escrever o próprio
 * `asaasWalletId` redirecionaria o split de qualquer cobrança.
 */
export class SalvarContaDeRecebimentoDto {
  @ApiProperty({
    example: "11999998888",
    description:
      "Chave PIX (CPF/CNPJ/e-mail/telefone/aleatória) — mesma política de `RequestWithdrawalDto`: a Rotta valida presença, não formato.",
  })
  @IsString()
  @Length(1, 140)
  chavePix!: string;
}
