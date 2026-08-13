import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * "Informar código da transportadora" (Frente N, briefing item 9) — o
 * mesmo `Company.codigoInterno` público usado pelo Responsável no
 * Marketplace (Frente M). `role` NÃO vem no corpo: é sempre
 * `actor.role` (o que o próprio usuário escolheu em `registerAutonomo`),
 * nunca algo que o cliente possa escolher livremente na hora do pedido.
 */
export class CreateCompanyJoinRequestDto {
  @ApiProperty({ example: "TRN-000001" })
  @IsString()
  @IsNotEmpty()
  codigoInterno!: string;
}
