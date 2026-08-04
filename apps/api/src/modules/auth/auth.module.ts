import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";

import {
  INVITE_REPOSITORY,
  PASSWORD_RESET_TOKEN_REPOSITORY,
  SESSION_REPOSITORY,
} from "./auth.constants";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { InvitesController } from "./invites.controller";
import { InvitesService } from "./invites.service";
import { PasswordResetNotifierService } from "./password-reset-notifier.service";
import { PrismaInviteRepository } from "./repositories/prisma-invite.repository";
import { PrismaPasswordResetTokenRepository } from "./repositories/prisma-password-reset-token.repository";
import { PrismaSessionRepository } from "./repositories/prisma-session.repository";
import { JwtStrategy } from "./strategies/jwt.strategy";

import type { AuthConfig } from "@/config/auth.config";

import { SecurityModule } from "@/infra/security/security.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
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
 * `ThrottlerModule` registrado aqui (não em `app.module.ts`) porque,
 * hoje, só as rotas deste módulo precisam de rate limiting dedicado
 * (login/registro/recuperação de senha/resgate de convite — Dossiê 12
 * §7.4); aplicado por controller via `@UseGuards(ThrottlerGuard)`, nunca
 * como guard global (evitaria interferir na ordem já testada de
 * Guards de `app.module.ts`).
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
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 30 }],
      // Suites E2E disparam dezenas de requisições/minuto contra o mesmo
      // processo de propósito (Dossiê 23 §10) — rate limiting é uma
      // preocupação de produção, nunca deveria fazer um teste falhar por
      // ser "rápido demais". Nenhum código de produção lê `NODE_ENV`
      // para decidir comportamento de negócio, só este guard técnico.
      skipIf: () => process.env.NODE_ENV === "test",
    }),
    SecurityModule,
    UsersModule,
    CompaniesModule,
    MessagePersonalizationModule,
  ],
  controllers: [AuthController, InvitesController],
  providers: [
    JwtStrategy,
    AuthService,
    InvitesService,
    PasswordResetNotifierService,
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useClass: PrismaPasswordResetTokenRepository },
    { provide: INVITE_REPOSITORY, useClass: PrismaInviteRepository },
  ],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
