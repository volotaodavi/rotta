import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { ExecutionContext } from "@nestjs/common";
import type { ThrottlerLimitDetail } from "@nestjs/throttler";

/**
 * Rate limiting da Core API (pedido do usuário 17/09/2026: "impedir
 * milhares de requisições em 1 seg, 1 minuto e quebrar o site" +
 * "limite para o quesito de não quebrar + estourar o limite gratuito").
 *
 * Duas decisões carregam o desenho inteiro:
 *
 * 1. CONTA POR USUÁRIO, NÃO POR IP. O Rotta é usado majoritariamente no
 *    celular, em rede móvel — Vivo/Claro/TIM colocam milhares de
 *    assinantes atrás do mesmo IPv4 (CGNAT). Um limite por IP
 *    transformaria "o motorista mandou GPS demais" em "toda a operadora
 *    ficou bloqueada". Requisição autenticada é contada pelo `sub` do
 *    JWT; só rota pública (login, cadastro, consulta de CNPJ) cai no IP,
 *    porque ali não existe usuário ainda.
 *
 * 2. O IP É LIDO DO CABEÇALHO DA BORDA, NÃO DO SOCKET. Isto corrige um
 *    bug real que estava em produção: o `getTracker` padrão do
 *    `@nestjs/throttler` usa `req.ips[0] ?? req.ip`, e `req.ips` só é
 *    preenchido com `trust proxy` ligado no Express — que nunca foi
 *    ligado aqui. Com Cloudflare na frente do Render, `req.ip` era o IP
 *    do proxy para TODO MUNDO, ou seja, o limite de 5 logins/minuto do
 *    `AuthController` era 5 logins/minuto no mundo inteiro somado, não
 *    por pessoa. `cf-connecting-ip` é escrito (e sobrescrito) pela
 *    própria Cloudflare, então é confiável enquanto o tráfego entrar
 *    por lá; o `x-forwarded-for` fica só como rede de segurança e é
 *    falsificável — o que, no pior caso, devolve o comportamento que já
 *    existia hoje, nunca algo pior.
 *
 * O armazenamento dos contadores é o `ThrottlerStorageService` em
 * memória (padrão do pacote), NÃO o Redis, de propósito: o Redis
 * custaria 2–3 comandos por requisição HTTP, e "não estourar o limite
 * gratuito" foi metade do pedido — seria justamente o throttler o maior
 * consumidor da cota. Em memória o contador é exato enquanto a API
 * roda em UMA instância (o caso hoje, plano atual do Render). Se um dia
 * subir para N instâncias, o limite efetivo vira N× mais frouxo e aí
 * sim vale trocar o `storage` por um backend compartilhado — é a única
 * linha que precisa mudar, em `throttler.options.ts`.
 */
@Injectable()
export class RottaThrottlerGuard extends ThrottlerGuard {
  /**
   * Chave de contagem. Roda DEPOIS do `JwtAuthGuard` (ver a ordem dos
   * `APP_GUARD` em `app.module.ts`), que é o que garante `req.user`
   * preenchido e já validado — nunca dá para confiar num id de usuário
   * lido de um token não verificado, porque aí bastaria forjar um `sub`
   * novo a cada requisição para zerar o contador.
   */
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as AuthenticatedUser | undefined;
    if (user?.sub) {
      return Promise.resolve(`u:${user.sub}`);
    }

    return Promise.resolve(`ip:${ipDoCliente(req)}`);
  }

  /**
   * Mensagem em português — a padrão do pacote ("ThrottlerException:
   * Too Many Requests") apareceria crua para o usuário final, já que o
   * `AllExceptionsFilter` repassa a mensagem da `HttpException`.
   */
  protected override getErrorMessage(
    _context: ExecutionContext,
    detalhe: ThrottlerLimitDetail,
  ): Promise<string> {
    const segundos = Math.max(1, detalhe.timeToBlockExpire || detalhe.timeToExpire);
    return Promise.resolve(
      `Muitas requisições em pouco tempo. Tente novamente em ${segundos} segundo${segundos === 1 ? "" : "s"}.`,
    );
  }
}

/**
 * IP real de quem fez a requisição, na ordem de confiança: o cabeçalho
 * que a Cloudflare escreve, depois o `true-client-ip` (Enterprise e
 * alguns proxies), depois o primeiro salto do `x-forwarded-for`, e por
 * último o socket. Ver a nota 2 na classe acima.
 */
export function ipDoCliente(req: Record<string, unknown>): string {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;

  const primeiro = (valor: string | string[] | undefined): string | undefined => {
    const texto = Array.isArray(valor) ? valor[0] : valor;
    const limpo = texto?.split(",")[0]?.trim();
    return limpo ? limpo : undefined;
  };

  return (
    primeiro(headers["cf-connecting-ip"]) ??
    primeiro(headers["true-client-ip"]) ??
    primeiro(headers["x-forwarded-for"]) ??
    (typeof req.ip === "string" ? req.ip : undefined) ??
    "desconhecido"
  );
}
