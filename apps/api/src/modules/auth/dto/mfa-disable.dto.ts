import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** Desativa o MFA de uma sessão já autenticada — exige o código TOTP atual (§31 do briefing: "ações críticas exigem confirmação adicional"), nunca só a senha. */
export class MfaDisableDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
