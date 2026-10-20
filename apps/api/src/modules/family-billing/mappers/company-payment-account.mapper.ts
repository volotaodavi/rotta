import type { CompanyPaymentAccount } from "@prisma/client";

/**
 * O que a conta de recebimento mostra para fora.
 *
 * ## Por que existe uma lista explícita, e não o objeto do banco
 *
 * Até 20/10/2026 este endpoint devolvia a linha do Prisma inteira, o que
 * funcionava porque todo campo dela era público. No mesmo dia a tabela
 * ganhou `asaasApiKeyCifrada`, a chave de API da subconta do
 * transportador, e a entrega crua passou a colocar essa chave na
 * resposta HTTP sem ninguém ter pedido.
 *
 * Cifrada não é desculpa: a chave de cifra vive no mesmo servidor, e o
 * compromisso assumido quando o fundador autorizou guardar chave de
 * terceiro foi "nunca em log nem em resposta de API".
 *
 * Por isso a saída é montada campo a campo. Campo novo na tabela não
 * aparece aqui sozinho: alguém precisa escrever a linha, e escrever a
 * linha é o momento de perguntar se ele pode sair.
 */
export interface ContaDeRecebimentoResponse {
  id: string;
  companyId: string;
  status: CompanyPaymentAccount["status"];
  /** A subconta Asaas do transportador, que é o destino do split. */
  asaasWalletId: string | null;
  /** O `id` da subconta, para o admin conferir no painel da Asaas. */
  asaasAccountId: string | null;
  /** Para onde o transportador vai concluir o cadastro, quando houver. */
  asaasOnboardingUrl: string | null;
  /** `true` quando a chave da subconta está guardada: diz se dá para emitir cobrança em nome dela, sem dizer qual é. */
  podeEmitirPelaSubconta: boolean;
  chavePix: string | null;
  emissorDaCobranca: CompanyPaymentAccount["emissorDaCobranca"];
  custodiaAtiva: boolean;
  custodiaDiasParaLiberar: number | null;
  taxaDaPlataformaBps: number;
  taxaPixBps: number;
  taxaBoletoBps: number;
  taxaCreditoVistaBps: number;
  taxaCreditoParceladoBps: number;
  observacoes: string | null;
}

export function toContaDeRecebimentoResponse(
  conta: CompanyPaymentAccount,
): ContaDeRecebimentoResponse {
  return {
    id: conta.id,
    companyId: conta.companyId,
    status: conta.status,
    asaasWalletId: conta.asaasWalletId,
    asaasAccountId: conta.asaasAccountId,
    asaasOnboardingUrl: conta.asaasOnboardingUrl,
    /* O booleano, e nunca o valor: a tela precisa saber se dá para
       emitir pela subconta, e para isso não precisa ver a chave. */
    podeEmitirPelaSubconta: Boolean(conta.asaasApiKeyCifrada),
    chavePix: conta.chavePix,
    emissorDaCobranca: conta.emissorDaCobranca,
    custodiaAtiva: conta.custodiaAtiva,
    custodiaDiasParaLiberar: conta.custodiaDiasParaLiberar,
    taxaDaPlataformaBps: conta.taxaDaPlataformaBps,
    taxaPixBps: conta.taxaPixBps,
    taxaBoletoBps: conta.taxaBoletoBps,
    taxaCreditoVistaBps: conta.taxaCreditoVistaBps,
    taxaCreditoParceladoBps: conta.taxaCreditoParceladoBps,
    observacoes: conta.observacoes,
  };
}
