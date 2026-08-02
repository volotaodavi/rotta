import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

import { IsStrongPassword } from "@/common/validators";

export class ResetPasswordDto {
  @ApiProperty({ description: "Token recebido por e-mail no link de redefinição." })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: "NovaSenhaForte123" })
  @IsStrongPassword()
  novaSenha!: string;
}
