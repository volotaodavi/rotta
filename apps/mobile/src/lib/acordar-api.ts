import { env } from "@/config/env";

/** A API já inclui o prefixo `/v1` na URL; aqui só falta o caminho. */
const CAMINHO = "/health";

/**
 * Acorda a API no instante em que o app abre.
 *
 * ## Por que existe
 *
 * A API roda no plano gratuito do Render, que desliga o serviço depois
 * de 15 minutos sem tráfego e leva perto de 90 segundos para voltar
 * (medido em 03/09/2026, nota completa em
 * `apps/web/src/lib/wake-api.ts`).
 *
 * A web já resolvia isso: ela chama `wakeApi()` quando alguém entra na
 * Landing Page, e a pessoa gasta o cold start lendo a página. O app não
 * tinha nada equivalente, então quem pagava a espera inteira era o
 * usuário, parado na splash.
 *
 * Em 06/10/2026 isso apareceu como "o app da Rotta não está abrindo". A
 * outra metade do conserto está em `TIMEOUT_PARTIDA_FRIA_MS`: o app
 * desistia aos 60 segundos, antes de o servidor ficar pronto aos 90.
 * Esticar o teto sem acordar a API faria a pessoa esperar 90 segundos
 * olhando a splash; acordar sem esticar o teto continuaria estourando.
 * Os dois juntos é que resolvem.
 *
 * ## Por que não é um ping de 24 horas
 *
 * Porque isso consumiria quase toda a cota gratuita de 750h/mês do
 * Render à toa, de madrugada, sem ninguém usando. Dispara só com
 * abertura real do app: a pessoa já estava vindo de qualquer jeito.
 *
 * Falha aqui nunca aparece para ninguém. É otimização de latência, e o
 * fluxo real (renovar sessão, entrar) já trata servidor lento ou fora do
 * ar com as próprias mensagens.
 */
export function acordarApi(): void {
  if (!env.EXPO_PUBLIC_API_URL) return;

  void fetch(`${env.EXPO_PUBLIC_API_URL}${CAMINHO}`, { method: "GET" }).catch(() => undefined);
}
