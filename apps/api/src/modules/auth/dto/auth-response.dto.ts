import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Role } from "@/shared/enums";

/** Perfil resolvido (User + vínculo ativo) — payload embutido em toda resposta de autenticação bem-sucedida. */
export class MeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() email!: string;
  @ApiProperty() telefone!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiPropertyOptional({ description: "null apenas para Role.ADMIN_ROTTA." })
  companyId?: string | null;
  @ApiPropertyOptional() companyName?: string | null;
}

/** Resposta de login/registro/refresh/resgate de convite bem-sucedidos (Dossiê 15). */
export class AuthTokensResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: MeResponseDto }) user!: MeResponseDto;
}

/** Um vínculo ativo entre os quais o usuário pode escolher (Dossiê 15, `AUTH-02` — seletor de perfil). */
export class ProfileOptionDto {
  @ApiProperty() companyId!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty({ enum: Role }) role!: Role;
}

/**
 * Retornada em vez de `AuthTokensResponseDto` quando o usuário tem mais
 * de um `Membership` ativo e não informou `companyId` no login — nenhum
 * token é emitido até a escolha.
 */
export class ProfileSelectionResponseDto {
  @ApiProperty() requiresProfileSelection!: true;
  @ApiProperty({ type: [ProfileOptionDto] }) profiles!: ProfileOptionDto[];
}
