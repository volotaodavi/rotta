import { ApiProperty } from "@nestjs/swagger";

import { IsLoginEmail } from "@/common/validators";

export class ForgotPasswordDto {
  @ApiProperty({ example: "ana@transportadora.com.br" })
  @IsLoginEmail()
  email!: string;
}
