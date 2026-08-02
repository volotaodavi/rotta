import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

/**
 * Login único (Dossiê 15, `AUTH-02`) — mesmo endpoint para toda
 * plataforma (Landing Page/Site/Painel Web/App), aceitando telefone,
 * e-mail ou CPF como identificador (resolvido por `UsersService.findByIdentifier`).
 *
 * `companyId`: quando o usuário tem mais de um `Membership` ativo, a
 * primeira chamada (sem `companyId`) retorna a lista de perfis
 * disponíveis em vez de tokens (ver `AuthService.login`); o cliente
 * reenvia as mesmas credenciais informando qual `companyId` escolheu.
 */
export class LoginDto {
  @ApiProperty({ example: "ana@transportadora.com.br", description: "E-mail, telefone ou CPF." })
  @IsString()
  @IsNotEmpty()
  identificador!: string;

  @ApiProperty({ example: "SenhaForte123" })
  @IsString()
  @IsNotEmpty()
  senha!: string;

  @ApiPropertyOptional({
    description: "Necessário apenas quando o usuário tem mais de um vínculo ativo.",
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ example: "iPhone de Ana" })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
