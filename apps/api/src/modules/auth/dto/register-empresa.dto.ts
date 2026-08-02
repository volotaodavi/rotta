import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsBoolean } from "class-validator";

import { CreateCompanyDto } from "@/modules/companies/dto/create-company.dto";

/**
 * Cadastro self-service (Dossiê 15, `AUTH-01`) — mesmos dados de
 * `CreateCompanyDto` (Dossiê 16), já que a operação de negócio é
 * idêntica ("criar Company + User administrador + Membership em uma
 * única transação"); a única diferença é QUEM aciona (o próprio
 * registrante, não o Admin Rotta) e o aceite de termos, obrigatório
 * aqui e ausente no cadastro administrativo.
 */
export class RegisterEmpresaDto extends CreateCompanyDto {
  @ApiProperty({
    example: true,
    description:
      "Aceite dos Termos de Uso e da Política de Privacidade (LGPD) — obrigatoriamente true.",
  })
  @IsBoolean()
  @Equals(true, { message: "É necessário aceitar os Termos de Uso e a Política de Privacidade." })
  aceiteTermos!: boolean;
}
