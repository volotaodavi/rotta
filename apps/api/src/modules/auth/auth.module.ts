import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import {
  INVITE_REPOSITORY,
  PASSWORD_RESET_TOKEN_REPOSITORY,
  SESSION_REPOSITORY,
} from "./auth.constants";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { InvitesController } from "./invites.controller";
import { InvitesService } from "./invites.service";
import { MfaService } from "./mfa.service";
import { PasswordResetNotifierService } from "./password-reset-notifier.service";
import { PrismaInviteRepository } from "./repositories/prisma-invite.repository";
import { PrismaPasswordResetTokenRepository } from "./repositories/prisma-password-reset-token.repository";
import { PrismaSessionRepository } from "./repositories/prisma-session.repository";
import { JwtStrategy } from "./strategies/jwt.strategy";

import type { AuthConfig } from "@/config/auth.config";

import { EmailModule } from "@/infra/email/email.module";
import { SecurityModule } from "@/infra/security/security.module";
import { TurnstileModule } from "@/infra/turnstile/turnstile.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { CompanyJoinRequestsModule } from "@/modules/company-join-requests/company-join-requests.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { StudentPreRegistrationsModule } from "@/modules/student-pre-registrations/student-pre-registrations.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo de Autenticação (Dossiê 15, `AUTH-*`) — login único
 * compartilhado por toda a plataforma (briefing: "o usuário possuirá
 * apenas UMA conta... todas as plataformas compartilharão exatamente a
 * mesma conta"). Reutiliza `CompaniesModule`/`UsersModule` (Dossiê 16)
 * para o cadastro self-service e a identidade global — nunca duplica a
 * criação de Company/User/Membership.
 *
 * Importa `MessagePersonalizationModule` (nunca `NotificationsModule`
 * inteiro, ver nota em `notifications.module.ts`) só para
 * `MessagePersonalizationService` (compor `novoResponsavel`);
 * `EventEmitter2` (emitir `communication.requested` em `registerPessoal`
 * — evento `NOVO_RESPONSAVEL`) é injetado sem import extra, já global em
 * `AppModule`. Nunca chama `NotificationsService` diretamente.
 *
 * O rate limiting das rotas deste módulo (login/registro/recuperação de
 * senha/resgate de convite — Dossiê 12 §7.4) continua valendo, e mais
 * apertado que o resto da API, mas desde 17/09/2026 não é mais
 * configurado aqui: o `ThrottlerModule` é registrado uma única vez em
 * `app.module.ts` e aplicado a toda a API por um guard global. O que
 * sobra neste módulo são os `@Throttle(...)` por rota do
 * `AuthController`/`InvitesController`, que apertam a faixa `default`
 * de 120/min para 5 ou 10/min onde faz diferença.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.get<AuthConfig>("auth");
        return {
          privateKey: authConfig?.jwtPrivateKey,
          publicKey: authConfig?.jwtPublicKey,
          signOptions: {
            algorithm: "RS256",
            expiresIn: authConfig?.accessTokenTtl,
          },
        };
      },
    }),
    SecurityModule,
    UsersModule,
    CompaniesModule,
    MessagePersonalizationModule,
    AuditModule,
    StudentPreRegistrationsModule,
    CompanyJoinRequestsModule,
    EmailModule,
    TurnstileModule,
  ],
  controllers: [AuthController, InvitesController],
  providers: [
    JwtStrategy,
    AuthService,
    InvitesService,
    PasswordResetNotifierService,
    MfaService,
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useClass: PrismaPasswordResetTokenRepository },
    { provide: INVITE_REPOSITORY, useClass: PrismaInviteRepository },
  ],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
