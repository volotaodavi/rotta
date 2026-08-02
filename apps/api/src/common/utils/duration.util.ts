/**
 * Converte um TTL no mesmo formato aceito por `@nestjs/jwt`
 * (`"15m"`, `"30d"`, ...) em milissegundos, para uso em colunas de banco
 * (`Session.expiresAt`) que precisam de um `Date` concreto — o JWT em si
 * já resolve sua própria expiração internamente, nenhuma dependência
 * nova é necessária só para isto.
 */
export function parseDurationToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Duração inválida: "${value}" (formato esperado: ex. "15m", "30d").`);
  }

  const amount = Number(match[1]);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitMs[match[2]!]!;
}
