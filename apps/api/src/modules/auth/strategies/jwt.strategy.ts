import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuthConfig } from "@/config/auth.config";

/**
 * Estrategia Passport que valida o JWT de acesso (assinatura RS256 com a
 * chave publica, Dossie 12 Secao 4.2) e resolve o payload minimo do
 * usuario autenticado. Consumida pelo `JwtAuthGuard`.
 *
 * Nao implementa nenhuma regra de negocio (ex. checar se a sessao foi
 * revogada, Dossie 12 Secao 4.4 — denylist) — isso pertence ao modulo
 * Auth quando a funcionalidade real for construida.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService) {
    const authConfig = configService.get<AuthConfig>("auth");

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig?.jwtPublicKey,
      algorithms: ["RS256"],
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    return payload;
  }
}
