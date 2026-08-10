import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** Confirma o setup: prova posse do app autenticador com o primeiro código de 6 dígitos gerado. */
export class MfaEnableDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mfaSetupToken!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
