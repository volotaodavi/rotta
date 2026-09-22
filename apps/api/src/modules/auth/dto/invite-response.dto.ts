import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Role } from "@/shared/enums";

export class InviteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: "M586PO" }) codigo!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() usadoEm?: Date | null;
}

/** Devolvido ao consultar um código antes de completar o cadastro (tela "Já fui convidado"). */
export class InvitePreviewResponseDto {
  @ApiProperty() companyName!: string;
  @ApiProperty({ enum: Role }) role!: Role;

  @ApiPropertyOptional({
    description:
      "Só em convite `ESCOLA`: o nome da escola. Quem trabalha na secretaria precisa ver a ESCOLA antes de aceitar — o nome da transportadora que convidou não diz nada a ele, e aceitar o convite errado significaria ver as crianças de outra escola.",
    nullable: true,
  })
  schoolName?: string | null;
}
