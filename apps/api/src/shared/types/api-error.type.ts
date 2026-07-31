/**
 * Formato padrao de erro de toda API da Rotta (Dossie 13, Secao 23).
 *
 * Espelha `ApiErrorBody` de `packages/api-client/src/http.ts` no
 * frontend — ate este contrato ser promovido para `shared/contracts`
 * (Dossie 22, Secao 6.3) como fonte unica de verdade, os dois lados
 * mantem a mesma forma por convencao manual.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  field?: string;
  correlationId?: string;
}
