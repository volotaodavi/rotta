import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Segundo fator do login (Dossiê 43) — `mfaChallengeToken` retornado por
 * `MfaChallengeResponseDto`. Aceita OU o código de 6 dígitos do app
 * autenticador OU um código de recuperação de uso único (perdeu o
 * celular) — nunca os dois exigidos ao mesmo tempo.
 */
export class MfaVerifyLoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mfaChallengeToken!: string;

  @ApiPropertyOptional({ example: "123456" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: "AB3C-9KLM" })
  @IsOptional()
  @IsString()
  recoveryCode?: string;
}
