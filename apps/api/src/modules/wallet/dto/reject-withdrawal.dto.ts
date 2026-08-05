import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/** Exclusivo de Admin Rotta (Dossiê 26, Seção 5). */
export class RejectWithdrawalDto {
  @ApiProperty({ example: "Chave PIX inválida — confirmar com o solicitante." })
  @IsString()
  @Length(3, 500)
  motivo!: string;
}
