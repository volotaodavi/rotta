import { Transform } from "class-transformer";

/**
 * BUG REAL de produção encontrado em auditoria (usuário 03/09/2026:
 * "faça uma auditoria minuciosa... pra entender o que está dando
 * falha"): `@Type(() => Boolean)` do class-transformer chama
 * `Boolean(valorCru)` — e `Boolean("false")` é `true` em JavaScript
 * (qualquer string não-vazia é truthy). Toda query string manda
 * booleanos como texto (`?arquivado=false`), então um filtro passado
 * como "false" virava "true" silenciosamente, sem erro nenhum —
 * achado exato: `GET /support/tickets?arquivado=false` (o painel Admin
 * manda esse valor sempre) devolvia SÓ os chamados ARQUIVADOS,
 * deixando a Central de Atendimento "Ativos" permanentemente vazia
 * pra todo Admin Rotta, desde que o filtro de arquivamento existe.
 *
 * `@ParseQueryBoolean()` substitui `@Type(() => Boolean)` em todo DTO
 * de query — só reconhece as strings literais `"true"`/`"false"` (e já
 * repassa um `boolean` real sem tocar, pro caso de algum chamador nunca
 * passar pela serialização de querystring). Qualquer outro valor cai
 * como está, pro `@IsBoolean()` do próprio campo rejeitar com um erro
 * claro em vez de mascarar como `true`.
 */
export function ParseQueryBoolean() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  });
}
