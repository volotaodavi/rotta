import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { LytexClientService } from "./lytex-client.service";

import type {
  CreateLytexSubAccountInput,
  LytexCompanyType,
  LytexSplitInput,
  LytexSubAccount,
  LytexSubAccountStatus,
} from "./types/lytex.types";
import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountStatus,
  CompanyType,
  InvoicePaymentMethod,
} from "@prisma/client";

/**
 * O tipo de empresa da Rotta traduzido para o da Lytex.
 *
 * A Lytex aceita oito valores (`mei`, `others`, `ei`, `eireli`, `slu`,
 * `ltda`, `ss`, `sa`), e tem os dois que faltavam no Asaas: `ss` para
 * sociedade simples e `sa` para sociedade anônima, que antes caíam os
 * dois em `LIMITED` por não haver nada melhor.
 *
 * `AUTONOMO` segue em `undefined`: o campo é de pessoa jurídica, e o
 * transportador autônomo entra como `type: "pf"`, sem `companyType`.
 * Cooperativa cai em `others`, que é o valor que a Lytex oferece para o
 * que não é nenhuma das formas listadas.
 */
const TIPO_DE_EMPRESA_NA_LYTEX: Record<CompanyType, LytexCompanyType | undefined> = {
  AUTONOMO: undefined,
  MEI: "mei",
  LTDA: "ltda",
  SA: "sa",
  COOPERATIVA: "others",
  SOCIEDADE_SIMPLES: "ss",
  OUTRO: "others",
};

/**
 * `status` da subconta na Lytex traduzido para o estado da conta de
 * recebimento da Rotta.
 *
 * São quatro valores, e eles dizem menos do que os do Asaas diziam: a
 * Lytex não publica um estado "em análise" separado. A subconta nasce e
 * o KYC corre por fora; enquanto `splitAutorization` não for `true`, ela
 * não divide nada. Por isso `ATIVA` aqui depende das duas coisas, e quem
 * faz essa conta é `estadoDaSubconta`, não esta tabela.
 */
const SITUACAO_DA_SUBCONTA: Record<LytexSubAccountStatus, CompanyPaymentAccountStatus> = {
  active: "ATIVA",
  blocked: "RECUSADA",
  disabled: "RECUSADA",
  pending_exclusion: "RECUSADA",
};

/** O que a Rotta precisa saber da transportadora para abrir a subconta. */
export interface DadosParaAbrirSubcontaLytex {
  razaoSocial: string;
  nomeFantasia?: string;
  cpfCnpj: string;
  tipo: CompanyType;
  email: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  faturamentoMensalCentavos: number;
  /** Para onde a Lytex avisa o que acontece nesta subconta. */
  webhookUrl?: string;
}

/**
 * Subconta da transportadora na Lytex, e o split da taxa da Rotta.
 *
 * ## O que muda em relação ao desenho do Asaas
 *
 * No Asaas, a custódia só existia se a cobrança fosse criada **com a
 * chave de API da subconta**, porque só a conta que recebe tem retenção.
 * Isso obrigava a Rotta a guardar a chave de um terceiro, cifrada, com
 * auditoria de uso. Era o ponto mais delicado daquele desenho, e é o que
 * a Lytex resolve: a cobrança sai em nome da subconta pelo header
 * `subRecipientId`, com a credencial da própria plataforma.
 *
 * **Nenhuma chave de terceiro é guardada nesta arquitetura.** A coluna
 * `asaasApiKeyCifrada` continua no banco por ser do fluxo antigo, e não
 * é escrita nem lida por nada daqui.
 *
 * ## O sentido do split se inverte, e isso importa
 *
 * Na fatura avulsa, emitida pela subconta: o dinheiro é dela, e o split
 * manda a NOSSA taxa para o `_recipientId` da Rotta.
 *
 * Na assinatura, emitida pela conta da Rotta (a Lytex não aceita
 * `subRecipientId` em `/v2/subscriptions`): o dinheiro é nosso, e o
 * split manda para a subconta o que sobra depois da nossa taxa.
 *
 * `montarSplit` recebe o sentido como parâmetro justamente porque errar
 * isso significaria mandar 98,71% para quem já tem o dinheiro e ficar
 * com 1,29% de nada.
 */
@Injectable()
export class LytexSubcontasService {
  private readonly logger = new Logger(LytexSubcontasService.name);

  constructor(private readonly client: LytexClientService) {}

  // ---------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------

  /**
   * Abre a subconta a partir do que a Rotta já sabe da transportadora.
   *
   * O transportador não abre a Lytex, não preenche formulário de
   * terceiro e não cria senha em lugar nenhum: os dados saem do cadastro
   * que foi conferido na entrada dele na plataforma.
   *
   * ## Por que o CPF/CNPJ vai mesmo sendo opcional
   *
   * O esquema da Lytex marca `cpfCnpj` como opcional, mas o suporte
   * confirmou em 22/10/2026 que **o KYC não libera a subconta sem ele**.
   * Uma subconta criada sem documento ficaria parada sem que ninguém
   * soubesse por quê, então aqui ele é obrigatório e a falta vira erro
   * antes da chamada.
   */
  async criarSubconta(dados: DadosParaAbrirSubcontaLytex): Promise<LytexSubAccount> {
    const documento = apenasDigitos(dados.cpfCnpj);
    if (!documento) {
      throw new BadRequestException(
        "A transportadora está sem CPF ou CNPJ no cadastro, e a Lytex não libera a subconta sem o documento. Complete o cadastro antes de abrir a conta de recebimento.",
      );
    }

    /* `pj` por CNPJ (14 dígitos), `pf` por CPF. O autônomo da Rotta é
       pessoa física de verdade, e mandar `pj` faria o KYC bater contra
       um documento que não é de empresa. */
    const tipo = documento.length > 11 ? "pj" : "pf";

    const input: CreateLytexSubAccountInput = {
      type: tipo,
      name: dados.razaoSocial,
      fantasyName: dados.nomeFantasia,
      cpfCnpj: documento,
      cellphone: apenasDigitos(dados.telefone),
      email: dados.email,
      /* Só em PJ: em pessoa física o campo não faz sentido, e mandar um
         valor "mais próximo" seria inventar natureza jurídica. */
      companyType: tipo === "pj" ? TIPO_DE_EMPRESA_NA_LYTEX[dados.tipo] : undefined,
      address: {
        street: dados.endereco,
        number: dados.numero,
        complement: dados.complemento,
        zone: dados.bairro,
        city: dados.cidade,
        state: dados.uf.toUpperCase(),
        zip: apenasDigitos(dados.cep),
      },
      aboutBusiness: "Transporte escolar de alunos, com mensalidade cobrada das famílias.",
      webhookUrl: dados.webhookUrl,
      expectedMonthlyBilling: dados.faturamentoMensalCentavos,
      /* Uma emissão por aluno por mês. Serve para a Lytex calibrar o
         limite inicial de emissões, que é o teto que trava a densidade
         de alunos por transportadora enquanto o KYC não sobe. */
      numberOfExpectedMonthlyEmissions: estimativaDeEmissoes(dados.faturamentoMensalCentavos),
    };

    /* O aviso vem ANTES da resposta chegar, e não depois: se a criação
       der certo e a gravação falhar, a subconta fica órfã na Lytex e
       esta linha é a única pista de que ela existe. Mesma lição da
       subconta órfã do Asaas. */
    this.logger.warn(
      `Criando subconta na Lytex para ${dados.razaoSocial} (${documento}). Se nao houver uma linha de confirmacao com o id logo abaixo desta, a subconta ficou ORFA no provedor.`,
    );

    const subconta = await this.client.createSubAccount(input);

    this.logger.log(
      `Subconta Lytex ${subconta._id} criada (recipient ${subconta._recipientId ?? subconta._id}, status ${subconta.status ?? "nao informado"}, split ${subconta.splitAutorization ? "liberado" : "ainda nao liberado"}).`,
    );

    return subconta;
  }

  /**
   * Relê a subconta na Lytex e devolve o estado que a Rotta deve gravar.
   *
   * ## Por que `ATIVA` exige as duas coisas
   *
   * `status: "active"` diz que a conta existe e não está bloqueada.
   * `splitAutorization` diz que ela pode dividir. Uma subconta ativa sem
   * autorização de split recebe cobrança mas não repassa a taxa da
   * Rotta, e marcá-la como ATIVA mostraria na tela um recebimento que
   * funciona pela metade. Enquanto o split não estiver liberado, ela
   * fica `EM_ANALISE`, que é a verdade: o KYC ainda está correndo.
   */
  async sincronizar(subAccountId: string): Promise<{
    status: CompanyPaymentAccountStatus;
    recipientId: string | null;
    splitLiberado: boolean;
  }> {
    const subconta = await this.client.getSubAccount(subAccountId);
    return {
      status: this.estadoDaSubconta(subconta),
      recipientId: subconta._recipientId ?? null,
      splitLiberado: Boolean(subconta.splitAutorization),
    };
  }

  private estadoDaSubconta(subconta: LytexSubAccount): CompanyPaymentAccountStatus {
    if (!subconta.status) return "EM_ANALISE";

    const traduzido = SITUACAO_DA_SUBCONTA[subconta.status];
    if (!traduzido) {
      /* Valor fora dos quatro documentados: a Lytex acrescenta estado
         sem avisar, e mudar o estado de uma conta de recebimento por um
         nome que ninguém leu é pior do que não mudar. */
      this.logger.warn(
        `Status "${subconta.status}" desconhecido na subconta ${subconta._id}. Conta mantida em EM_ANALISE.`,
      );
      return "EM_ANALISE";
    }

    if (traduzido === "ATIVA" && !subconta.splitAutorization) return "EM_ANALISE";
    return traduzido;
  }

  // ---------------------------------------------------------------------
  // Split
  // ---------------------------------------------------------------------

  /**
   * Monta o split da cobrança, no sentido certo para quem a emitiu.
   *
   * `emissor` é `"SUBCONTA"` quando a cobrança nasce em nome da
   * transportadora (fatura avulsa, com o header `subRecipientId`) e
   * `"ROTTA"` quando nasce na nossa conta (assinatura, e qualquer
   * cobrança de transportadora que ainda não tem subconta).
   *
   * Devolve `undefined` quando não há split a fazer, e os três casos são
   * diferentes:
   *
   * - transportadora sem subconta: não há para quem dividir, o valor cai
   *   na conta da Rotta e vira crédito no Rotta Pay;
   * - emissor `SUBCONTA` com taxa zero: mandar `0` criaria uma linha de
   *   repasse de zero real no extrato dela todo mês;
   * - emissor `SUBCONTA` sem `LYTEX_ROTTA_RECIPIENT_ID`: não há para
   *   onde mandar a nossa parte, e inventar um destino é pior do que não
   *   reter nada. A falta vira aviso no log.
   */
  montarSplit(
    conta: CompanyPaymentAccount | null,
    meio: InvoicePaymentMethod,
    emissor: "ROTTA" | "SUBCONTA",
    recipientIdDaRotta: string | undefined,
  ): LytexSplitInput | undefined {
    const recipientDaSubconta = conta?.lytexRecipientId ?? conta?.lytexSubAccountId;
    if (!conta || !recipientDaSubconta) return undefined;

    const percentual = this.percentualDaRotta(conta, meio);

    if (emissor === "SUBCONTA") {
      if (percentual <= 0) return undefined;
      if (!recipientIdDaRotta) {
        this.logger.warn(
          `Cobranca emitida pela subconta ${recipientDaSubconta} com taxa de ${percentual}% configurada, mas LYTEX_ROTTA_RECIPIENT_ID esta ausente: a cobranca sai SEM split e a Rotta nao retem nada.`,
        );
        return undefined;
      }
      return {
        type: "percentage",
        recipients: [
          { _recipientId: recipientIdDaRotta, value: percentual, description: "Taxa da Rotta" },
        ],
      };
    }

    /* Emissor ROTTA: o dinheiro é nosso e o split é o que vai para a
       transportadora. Com taxa zero vai 100%, que é o combinado de hoje
       enquanto a taxa por transportadora não é ligada. */
    return {
      type: "percentage",
      recipients: [
        {
          _recipientId: recipientDaSubconta,
          value: 100 - percentual,
          description: "Mensalidade do transporte",
        },
      ],
    };
  }

  /**
   * A taxa da Rotta, em percentual, para o meio de pagamento da
   * cobrança.
   *
   * Valores aprovados pelo fundador em 20/10/2026, da tabela do CFO de
   * 18/10: Pix e boleto 1,29%, crédito à vista 0,99%, parcelado 0,49%.
   * Débito não é oferecido. A tabela não mudou com a troca de provedora:
   * o que mudou foi a tarifa que a provedora cobra, não a nossa.
   *
   * `taxaDaPlataformaBps` continua como piso geral, para a
   * transportadora configurada antes de as taxas por meio existirem.
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

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Quantas cobranças por mês esta subconta deve emitir.
 *
 * Estimativa pelo faturamento informado, dividido por uma mensalidade de
 * R$ 300,00, que é a média do setor usada na projeção de 23/10/2026. Não
 * é um número exato e não precisa ser: serve para a Lytex calibrar o
 * limite inicial de emissões, e o limite inicial é justamente o que
 * trava a densidade de alunos enquanto o KYC não sobe.
 */
function estimativaDeEmissoes(faturamentoMensalCentavos: number): number {
  const mensalidadeMedia = 300_00;
  return Math.max(1, Math.ceil(faturamentoMensalCentavos / mensalidadeMedia));
}
