import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

import { IsStrongPassword } from "@/common/validators";

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  senhaAtual!: string;

  @ApiProperty({ example: "NovaSenhaForte123" })
  @IsStrongPassword()
  novaSenha!: string;
}
