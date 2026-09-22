import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

/**
 * Ativa/desativa uma conta do Portal da Escola. Nunca apaga: quem
 * conferiu a saída das crianças ontem tem de continuar existindo no
 * histórico de hoje.
 */
export class DefinirStatusDaContaDto {
  @ApiProperty({ description: "`false` bloqueia o acesso sem remover a pessoa." })
  @IsBoolean()
  ativo!: boolean;
}
