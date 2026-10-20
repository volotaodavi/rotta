import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { AsaasClientService } from "./asaas-client.service";

import type { AsaasSplitInput } from "./types/asaas.types";
import type { CompanyPaymentAccount, InvoicePaymentMethod } from "@prisma/client";

import { SecretCipherService } from "@/infra/security/secret-cipher.service";

/**
 * Subconta Asaas da transportadora: criação, guarda da chave, split e
 * custódia (conta escrow).
 *
 * ## O achado que define esta classe
 *
 * A documentação de conta escrow diz que "apenas as subcontas com o
 * recurso habilitado terão seus recebimentos submetidos ao fluxo de
 * retenção". Ou seja: **a custódia segue a conta que RECEBE, e a conta
 * pai não tem custódia.** A consequência é contraintuitiva e decide a
 * arquitetura inteira:
 *
 * - Se a **Rotta** cria a cobrança com split para a transportadora, o
 *   valor dela cai na hora. Não existe retenção, e a conta pai da Rotta
 *   responde sozinha por chargeback de até 540 dias.
 * - Para haver retenção, a cobrança precisa ser criada **com a chave da
 *   subconta**, com split para a Rotta. Aí tudo, inclusive a nossa
 *   parte, segue o prazo de custódia daquela subconta.
 *
 * Por isso `CompanyPaymentAccount.emissorDaCobranca` existe, e é por
 * transportadora: dá para virar a chave uma a uma conforme o comercial
 * do Asaas liberar o white label, sem migração de dado e sem parar quem
 * já está cobrando.
 *
 * ## A chave de terceiro
 *
 * `POST /v3/accounts` devolve a `apiKey` da subconta, e a documentação
 * avisa que ela "é exibida na resposta da criação e deve ser capturada
 * nesse momento". Não existe endpoint para pedir de novo. É isso que
 * permite o transportador nunca abrir o Asaas: a conta dele nasce de um
 * formulário dentro da Rotta, e a chave nasce na nossa mão.
 *
 * Guardar chave de terceiro foi autorizado pelo fundador em 20/10/2026,
 * com três controles, todos implementados aqui:
 *
 * 1. **Cifrada em repouso**, AES-256-GCM, com chave própria
 *    (`ASAAS_SUBCONTA_ENCRYPTION_KEY`), separada da do MFA;
 * 2. **Nunca em log nem em resposta de API** — nenhum DTO expõe o campo,
 *    e `chaveDaSubconta` registra o uso sem registrar o valor;
 * 3. **Uso registrado**, com o motivo, em `Logger`, para auditoria.
 */
@Injectable()
export class AsaasSubcontasService {
  private readonly logger = new Logger(AsaasSubcontasService.name);

  constructor(
    private readonly asaasClient: AsaasClientService,
    private readonly secretCipher: SecretCipherService,
  ) {}

  /**
   * Cria a subconta e devolve o que precisa ser gravado.
   *
   * Devolve em vez de gravar porque a gravação é da camada que tem o
   * repositório, e porque a `apiKey` não pode sobreviver a uma falha de
   * escrita: ou a mesma operação persiste tudo, ou a subconta fica órfã
   * no Asaas com uma chave que ninguém mais consegue recuperar.
   */
  async criarSubconta(dados: {
    nome: string;
    email: string;
    cpfCnpj: string;
    telefone?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    faturamentoMensalCentavos: number;
  }): Promise<{
    asaasAccountId: string;
    asaasWalletId: string;
    asaasApiKeyCifrada: string | null;
    asaasOnboardingUrl: string | null;
  }> {
    const subconta = await this.asaasClient.createSubaccount({
      name: dados.nome,
      email: dados.email,
      cpfCnpj: dados.cpfCnpj,
      mobilePhone: dados.telefone,
      address: dados.endereco,
      addressNumber: dados.numero,
      complement: dados.complemento,
      province: dados.bairro,
      postalCode: dados.cep,
      /* `incomeValue` é o único campo que a documentação marca como
         obrigatório, e vai em reais, como todo valor da API deles. */
      incomeValue: dados.faturamentoMensalCentavos / 100,
    });

    if (!subconta.walletId) {
      throw new BadRequestException(
        "O Asaas criou a subconta mas não devolveu o walletId: sem ele não há split. Confira a conta no painel antes de tentar de novo, para não criar duas.",
      );
    }

    /*
      A chave pode não vir (a documentação diz que vem, mas o contrato
      não é nosso). Se não vier, a subconta ainda serve para receber
      split; o que não dá é emitir cobrança em nome dela. Falhar aqui
      jogaria fora uma subconta já criada, que é pior.
    */
    const cifrada = subconta.apiKey
      ? this.secretCipher.encrypt(subconta.apiKey, "subconta-asaas")
      : null;

    if (!cifrada) {
      this.logger.warn(
        `Subconta ${subconta.id} criada SEM apiKey na resposta. Ela recebe split, mas nao pode emitir cobranca propria, entao custodia fica indisponivel para esta transportadora.`,
      );
    }

    return {
      asaasAccountId: subconta.id,
      asaasWalletId: subconta.walletId,
      asaasApiKeyCifrada: cifrada,
      asaasOnboardingUrl: subconta.onboardingUrl ?? null,
    };
  }

  /**
   * Liga ou desliga a custódia de UMA subconta.
   *
   * Nunca o endpoint que configura todas de uma vez. Em 14/10/2026, de 8
   * transportadoras cadastradas, 7 não transacionavam, e a custódia tem
   * tarifa recorrente por subconta ligada: ligar tudo seria pagar, ou
   * cobrar da transportadora, por base parada.
   */
  async configurarCustodia(
    conta: CompanyPaymentAccount,
    opcoes: { ativa: boolean; diasParaLiberar?: number; tarifaNaSubconta: boolean },
  ): Promise<void> {
    if (!conta.asaasAccountId) {
      throw new BadRequestException(
        "Esta transportadora ainda não tem subconta no Asaas: crie a subconta antes de configurar a custódia.",
      );
    }

    await this.asaasClient.configurarCustodiaDaSubconta(conta.asaasAccountId, {
      enabled: opcoes.ativa,
      daysToExpire: opcoes.diasParaLiberar,
      isFeePayer: opcoes.tarifaNaSubconta,
    });

    this.logger.log(
      `Custodia ${opcoes.ativa ? "ligada" : "desligada"} na subconta ${conta.asaasAccountId} (empresa ${conta.companyId}), tarifa ${opcoes.tarifaNaSubconta ? "na subconta" : "na conta principal"}.`,
    );
  }

  /**
   * A chave da subconta, decifrada, com o uso registrado.
   *
   * O motivo é obrigatório porque é ele que vira a trilha de auditoria.
   * O valor nunca é logado.
   */
  chaveDaSubconta(conta: CompanyPaymentAccount, motivo: string): string {
    if (!conta.asaasApiKeyCifrada) {
      throw new BadRequestException(
        "Esta transportadora não tem chave de subconta guardada: a cobrança não pode ser emitida em nome dela.",
      );
    }

    this.logger.log(
      `Chave da subconta da empresa ${conta.companyId} usada: ${motivo}. (valor nunca registrado)`,
    );
    return this.secretCipher.decrypt(conta.asaasApiKeyCifrada, "subconta-asaas");
  }

  /**
   * O array `split` da cobrança, ou `undefined` quando não há split.
   *
   * ## Quem recebe o quê, e por que depende do emissor
   *
   * - `emissorDaCobranca = ROTTA`: a cobrança é da Rotta, então o split
   *   manda para a transportadora **o que sobra depois da nossa taxa**.
   * - `emissorDaCobranca = SUBCONTA`: a cobrança é da transportadora,
   *   então o split manda para a Rotta **a nossa taxa**.
   *
   * É a mesma divisão vista dos dois lados, e errar o lado manda o
   * dinheiro inteiro para quem não devia.
   *
   * ## O percentual é sobre o líquido
   *
   * A taxa do provedor é descontada antes da divisão, então ela é
   * rateada entre as partes. O número aqui incide sobre o valor
   * liquidado, não sobre o bruto, e é isso que as tabelas do CFO de
   * 18/10/2026 assumem.
   */
  montarSplit(
    conta: CompanyPaymentAccount | null,
    meio: InvoicePaymentMethod,
    walletIdDaRotta: string | undefined,
  ): AsaasSplitInput[] | undefined {
    if (!conta?.asaasWalletId) return undefined;

    const percentual = this.percentualDaRotta(conta, meio);

    if (conta.emissorDaCobranca === "SUBCONTA") {
      /* A cobrança é dela; o split é a nossa parte. Sem taxa, não há
         split nenhum: mandar `0` seria criar uma linha de repasse de
         zero real no extrato dela, todo mês. */
      if (percentual <= 0 || !walletIdDaRotta) return undefined;
      return [{ walletId: walletIdDaRotta, percentualValue: percentual }];
    }

    /* A cobrança é da Rotta; o split é o que vai para ela. Com taxa
       zero, vai 100%, que é o combinado de hoje: a Rotta ganha na
       assinatura da plataforma, não na mensalidade da família. */
    return [{ walletId: conta.asaasWalletId, percentualValue: 100 - percentual }];
  }

  /**
   * A taxa da Rotta, em percentual, para o meio de pagamento da cobrança.
   *
   * Valores aprovados pelo fundador em 20/10/2026, da tabela do CFO de
   * 18/10: Pix e boleto 1,29%, crédito à vista 0,99%, parcelado 0,49%.
   * Débito não é oferecido, porque o Asaas sozinho custa 2,01% contra um
   * teto de mercado de 1,99%: não há percentual nosso que caiba.
   *
   * `taxaDaPlataformaBps` continua valendo como piso geral, para a
   * transportadora que foi configurada antes de as taxas por meio
   * existirem.
   */
  private percentualDaRotta(conta: CompanyPaymentAccount, meio: InvoicePaymentMethod): number {
    const porMeio: Record<InvoicePaymentMethod, number> = {
      PIX: conta.taxaPixBps,
      BOLETO: conta.taxaBoletoBps,
      CARTAO_CREDITO: conta.taxaCreditoVistaBps,
      CARTAO_DEBITO: 0,
    };

    const bps = porMeio[meio] || conta.taxaDaPlataformaBps;
    return bps / 100;
  }
}
