import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { TurnstileConfig } from "@/config/turnstile.config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 8_000;

/** Formato documentado pela Cloudflare (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). */
interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Cloudflare Turnstile ("não sou um robô", pedido do usuário 01/09/2026)
 * — verifica no servidor o token que o widget do navegador gerou, antes
 * de criar uma conta (`AuthService.register`/`registerPessoal`/
 * `registerAutonomo`). Gratuito, sem cadastro de cartão.
 *
 * Stub honesto (mesmo padrão de `WhatsAppService`/`WebPushService`):
 * sem `TURNSTILE_SECRET_KEY` configurada, pula a verificação (loga um
 * aviso) em vez de travar todo cadastro por uma variável que ainda não
 * existe — quando as chaves forem coladas em produção, liga sozinho,
 * sem precisar mexer em código de novo.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly configService: ConfigService) {}

  /** @throws BadRequestException Token ausente/inválido, ou a Cloudflare recusou (só quando `TURNSTILE_SECRET_KEY` está configurada). */
  async assertHuman(token: string | undefined, remoteIp: string | undefined): Promise<void> {
    const { secretKey } = this.configService.get<TurnstileConfig>("turnstile")!;
    if (!secretKey) {
      this.logger.warn(
        "TURNSTILE_SECRET_KEY não configurada — verificação 'não sou um robô' desativada, cadastro seguindo sem checar.",
      );
      return;
    }

    if (!token) {
      throw new BadRequestException("Confirme que você não é um robô antes de continuar.");
    }

    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar a Cloudflare pra verificação Turnstile (indisponível): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException(
        "Não foi possível confirmar que você não é um robô agora. Tente novamente em instantes.",
      );
    } finally {
      clearTimeout(timeout);
    }

    const result = (await response.json()) as SiteverifyResponse;
    if (!result.success) {
      this.logger.warn(
        `Token Turnstile recusado pela Cloudflare: ${(result["error-codes"] ?? []).join(", ") || "sem detalhe"}.`,
      );
      throw new BadRequestException(
        "Não foi possível confirmar que você não é um robô. Atualize a página e tente de novo.",
      );
    }
  }
}
