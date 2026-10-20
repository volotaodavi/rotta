/**
 * O webhook da Asaas trouxe um evento de situação de conta
 * (`ACCOUNT_STATUS_*`), e a conta é a subconta de uma transportadora.
 *
 * ## Por que um evento, e não uma chamada direta
 *
 * Mesmo motivo de `FAMILY_INVOICE_WEBHOOK_EVENT`: `BillingModule` é
 * importado por `FamilyBillingModule` (pelo `AsaasClientService`), e
 * chamar de volta fecharia o ciclo entre os dois módulos.
 *
 * ## Por que o nome do evento viaja junto
 *
 * O estado é decidido por `accountStatus.general`, não pelo nome do
 * evento — os dezoito eventos de situação carregam o mesmo objeto
 * `accountStatus` completo. O nome vem só para o log: quando alguém
 * perguntar por que a conta mudou, a resposta é "foi o evento tal".
 */
export const ASAAS_ACCOUNT_STATUS_EVENT = "family-billing.subconta.situacao";

export interface AsaasAccountStatusEvent {
  /** Nome cru do evento da Asaas (`ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED`...). */
  asaasEvent: string;
  /** `account.id` do payload: o `id` da subconta, que é o nosso `asaasAccountId`. */
  asaasAccountId: string;
  /**
   * `accountStatus.general`: `APPROVED`, `AWAITING_APPROVAL`, `PENDING`
   * ou `REJECTED`. Vem como texto cru, e não como união fechada, porque
   * o contrato é da Asaas: valor novo deve virar um aviso no log, não um
   * erro de runtime em caminho de webhook.
   */
  situacaoGeral: string;
}
