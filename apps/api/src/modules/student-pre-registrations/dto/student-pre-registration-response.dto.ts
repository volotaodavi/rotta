import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StudentPreRegistrationStatus } from "@prisma/client";

export class StudentPreRegistrationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() nomeAluno!: string;
  @ApiProperty() nomeResponsavel!: string;
  @ApiProperty() celularResponsavel!: string;
  @ApiProperty({ enum: StudentPreRegistrationStatus }) status!: StudentPreRegistrationStatus;
  @ApiProperty() createdAt!: Date;
}

/**
 * Resultado de "buscar pelo código + celular" do lado do Responsável
 * (pedido do usuário: "a pessoa deve clicar em 'continuar' e 'corrigir' —
 * deverá ter dois caminhos diferentes"). Nunca devolve
 * `celularResponsavel`/`companyId` cru pro cliente aqui — só o essencial
 * pra montar a tela de confirmação.
 */
export class StudentPreRegistrationLookupResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty() nomeAluno!: string;
  @ApiProperty() nomeResponsavel!: string;
}

export class ListStudentPreRegistrationsResponseDto {
  @ApiProperty({ type: [StudentPreRegistrationResponseDto] })
  items!: StudentPreRegistrationResponseDto[];
}

export class ClaimStudentPreRegistrationResponseDto extends StudentPreRegistrationLookupResponseDto {
  @ApiPropertyOptional() companyId!: string;
}
