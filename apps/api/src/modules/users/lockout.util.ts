/**
 * `RN-AUTH-02` — duração progressiva do bloqueio por tentativas.
 *
 * A auditoria de conformidade de 18/09/2026 encontrou o bloqueio fixo em
 * 15 minutos, enquanto a especificação (`docs/15`) pede bloqueio
 * "temporário PROGRESSIVO". Sem progressão, o segundo ataque custa ao
 * atacante exatamente o mesmo que o primeiro — e força bruta lenta
 * (5 tentativas, espera 15min, repete) fica viável para sempre.
 *
 * Aqui cada bloqueio consecutivo dobra a espera:
 *
 *     1º  15 min      4º   2 h
 *     2º  30 min      5º   4 h
 *     3º   1 h        …    até o teto de 24 h
 *
 * O contador é zerado por qualquer login bem-sucedido
 * (`UsersService.resetLoginFailures`): quem entrou provou ser o dono da
 * conta e não deve herdar a punição de um ataque que sofreu antes.
 *
 * O teto existe porque bloqueio eterno vira negação de serviço contra a
 * vítima: passado um dia, o caminho certo é recuperação de senha, não
 * esperar mais.
 */

/** Espera do primeiro bloqueio. Os seguintes dobram a partir dela. */
export const LOCKOUT_BASE_MS = 15 * 60 * 1000;

/** Teto — nunca bloqueia por mais que isto, por mais tentativas que haja. */
export const LOCKOUT_TETO_MS = 24 * 60 * 60 * 1000;

/**
 * Quanto tempo bloquear, dado quantos bloqueios consecutivos a conta já
 * sofreu (contando o que está sendo aplicado agora — o primeiro é `1`).
 */
export function duracaoDoBloqueioMs(bloqueiosConsecutivos: number): number {
  // `1` é o primeiro bloqueio, que vale a base. Valores menores que 1
  // (0, negativos) só aconteceriam por dado corrompido — tratar como o
  // primeiro é mais seguro que devolver algo menor que a base.
  const expoente = Math.max(0, bloqueiosConsecutivos - 1);

  // Sem `Math.pow` em expoente grande: 2^1024 vira `Infinity`, e
  // `new Date(Infinity)` é `Invalid Date` — que o Prisma rejeitaria com
  // um erro obscuro em vez de bloquear a conta. O `min` protege disso.
  const expoenteSeguro = Math.min(expoente, 40);

  return Math.min(LOCKOUT_BASE_MS * 2 ** expoenteSeguro, LOCKOUT_TETO_MS);
}
