import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AdminRottaPapel, CompanyType, ConsentType } from "@prisma/client";

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
  @ApiPropertyOptional({
    enum: CompanyType,
    description:
      "Forma societária da empresa vinculada (Dossiê 16, `EMP-01`) — null para Role.ADMIN_ROTTA/RESPONSAVEL ou Motorista/Monitor autônomo ainda sem vínculo. Frente G: front-end usa isto pra decidir se mostra o alternador Visão completa/Modo Ação (só role=empresa com AUTONOMO/MEI — dono que também dirige).",
  })
  companyType?: CompanyType | null;
  @ApiPropertyOptional({
    description:
      "MFA/TOTP ativado (Dossiê 43) — só relevante para Role.ADMIN_ROTTA, sempre false para os demais papéis.",
  })
  mfaEnabled?: boolean;
  @ApiPropertyOptional({
    description:
      "Faturamento (Dossiê 26) — true quando a empresa está com trial vencido (+1 dia de graça), inadimplente, suspensa ou cancelada. Só relevante para Role.EMPRESA/GESTOR (sempre false pros demais papéis, que não têm Company/mensalidade). Front usa isto pra mostrar o cadeado na navegação sem duplicar a regra de datas no cliente — ver `TrialGuard`/`resolveTrialBloqueioMotivo`.",
  })
  billingBlocked?: boolean;
  @ApiPropertyOptional({
    description:
      "Mensagem específica do motivo do bloqueio (null quando `billingBlocked` é false) — mesmo texto que o backend usa no popup de qualquer ação bloqueada.",
  })
  billingBlockedReason?: string | null;
  @ApiProperty({
    enum: ConsentType,
    isArray: true,
    description:
      "Consentimentos (Termos de Uso / Política de Privacidade, Dossiê 45 FRENTE 5) cuja versão vigente o usuário ainda não aceitou — vazio quando está tudo em dia. Cliente deve exibir um reaceite bloqueante quando não-vazio (mesma UX do cadastro, ver `POST /auth/me/consent`).",
  })
  pendingConsents!: ConsentType[];
  @ApiPropertyOptional({
    enum: AdminRottaPapel,
    description:
      "Sub-papel dentro de Role.ADMIN_ROTTA (pedido do usuário 03/09/2026 — suporte@/financeiro@/admin geral com áreas diferentes) — só presente pra ADMIN_ROTTA, undefined pra todo outro papel. Front usa isto pra decidir o que mostrar na navegação (ver Dossiê do painel Admin).",
  })
  adminPapel?: AdminRottaPapel;
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

/**
 * Retornada em vez de `AuthTokensResponseDto` no login de um Admin Rotta
 * SEM MFA ainda ativado (Dossiê 43 — obrigatório para este papel: "não
 * usar SUPER_ADMIN como desculpa para ignorar segurança"). Nenhum token
 * de acesso é emitido — `mfaSetupToken` só serve para os dois passos
 * seguintes (`POST /auth/mfa/setup` e `POST /auth/mfa/enable`), tem TTL
 * curto e não carrega `role`/`tenantId` (não autentica nenhuma outra
 * rota — ver nota em `AuthService.signMfaToken`).
 */
export class MfaSetupRequiredResponseDto {
  @ApiProperty() mfaSetupRequired!: true;
  @ApiProperty() mfaSetupToken!: string;
}

/** Segredo TOTP recém-gerado + material para o app autenticador escanear (Dossiê 43). */
export class MfaSetupResponseDto {
  @ApiProperty({
    description: "Segredo em Base32 — mostrado só como fallback de digitação manual.",
  })
  secret!: string;
  @ApiProperty() otpauthUrl!: string;
  @ApiProperty({ description: "PNG como data URL, pronto para <img src>." })
  qrCodeDataUrl!: string;
}

/** Confirmação de ativação do MFA — tokens de sessão + os únicos 10 códigos de recuperação (nunca mostrados de novo). */
export class MfaEnableResponseDto {
  @ApiProperty({ type: AuthTokensResponseDto }) tokens!: AuthTokensResponseDto;
  @ApiProperty({ type: [String] }) recoveryCodes!: string[];
}

/**
 * Retornada em vez de `AuthTokensResponseDto` no login de um Admin Rotta
 * COM MFA já ativado — aguarda `POST /auth/mfa/verify-login` com o
 * código do app autenticador (ou um código de recuperação).
 */
export class MfaChallengeResponseDto {
  @ApiProperty() mfaRequired!: true;
  @ApiProperty() mfaChallengeToken!: string;
}
