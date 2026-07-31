import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import type { AuthConfig } from "@/config/auth.config";

import { JwtStrategy } from "./strategies/jwt.strategy";

/**
 * Modulo de Autenticacao (Dossie 13, Secao 1 — `AUTH-*`).
 *
 * ESTADO ATUAL: apenas a infraestrutura tecnica de validacao de JWT
 * (necessaria para os guards globais funcionarem) — nenhum controller,
 * caso de uso ou regra de negocio (login por OTP/senha, refresh, sessoes,
 * 2FA — Dossie 15) foi implementado ainda. Ver "Próximos passos" na
 * documentacao de entrega desta fase.
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
  ],
  providers: [JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
