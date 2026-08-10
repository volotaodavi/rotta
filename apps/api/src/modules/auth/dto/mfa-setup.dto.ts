import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** `mfaSetupToken` retornado por `MfaSetupRequiredResponseDto` (login sem MFA ativado ainda). */
export class MfaSetupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mfaSetupToken!: string;
}
