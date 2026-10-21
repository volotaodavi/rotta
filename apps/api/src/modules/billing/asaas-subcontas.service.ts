import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

import { AsaasClientService } from "./asaas-client.service";

import type { AsaasCompanyType, AsaasSplitInput } from "./types/asaas.types";
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
   *
   * ## A checagem antes da chamada, e por que ela não é zelo
   *
   * Defeito real, encontrado em 21/10/2026 ao responder "existe alguma
   * subconta hoje?". Criar subconta no Asaas é **irreversível**, e isto
   * acontecia antes de a chave ser cifrada. Com
   * `ASAAS_SUBCONTA_ENCRYPTION_KEY` ausente — que era o estado da
   * produção —, a sequência real era:
   *
   * 1. a subconta nascia no Asaas;
   * 2. a cifra estourava;
   * 3. nada era gravado.
   *
   * Resultado: subconta órfã no provedor, sem registro na Rotta. E como
   * `asaasAccountId` nunca chegava ao banco, a recusa da "segunda
   * subconta" não disparava: a tentativa seguinte criava **outra** órfã.
   * Cada uma queimaria uma das 10 vagas do Período de Avaliação e
   * iniciaria o relógio de 60 dias.
   *
   * Por isso a pergunta vem antes da chamada. O que não pode falhar
   * depois de um efeito irreversível tem que ser conferido antes dele.
   */
  async criarSubconta(dados: {
    nome: string;
    email: string;
    cpfCnpj: string;
    telefone: string;
    endereco: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cep: string;
    /**
     * O e-mail que fica como LOGIN da conta.
     *
     * Separado de `email` porque, quando o transportador aponta um
     * e-mail de financeiro, é `email` que vira o login do Asaas — e o
     * dono perderia o acesso à própria conta de recebimento para o
     * contador. Aqui o login fica com a empresa.
     */
    emailDeLogin: string;
    /** `undefined` para pessoa física: o Asaas não aceita o campo em CPF. */
    companyType?: AsaasCompanyType;
    faturamentoMensalCentavos: number;
  }): Promise<{
    asaasAccountId: string;
    asaasWalletId: string;
    asaasApiKeyCifrada: string | null;
  }> {
    if (!this.secretCipher.podeCifrar("subconta-asaas")) {
      throw new ServiceUnavailableException(
        "A abertura de conta de recebimento ainda não está disponível nesta implantação. Nada foi criado: fale com o suporte da Rotta.",
      );
    }

    const subconta = await this.asaasClient.createSubaccount({
      name: dados.nome,
      email: dados.email,
      loginEmail: dados.emailDeLogin,
      cpfCnpj: dados.cpfCnpj,
      mobilePhone: dados.telefone,
      address: dados.endereco,
      addressNumber: dados.numero,
      complement: dados.complemento,
      province: dados.bairro,
      postalCode: dados.cep,
      companyType: dados.companyType,
      /* Em reais, como todo valor da API deles. Os nove campos acima
         são os obrigatórios do schema, e não só este: ver
         `CreateAsaasSubaccountInput`. */
      incomeValue: dados.faturamentoMensalCentavos / 100,
    });

    /*
      Registrado ANTES de qualquer coisa que possa falhar, e no nível de
      aviso. Daqui para frente existe uma subconta no Asaas que a Rotta
      ainda não gravou, e criar subconta não tem desfazer: se a gravação
      cair (banco fora, RLS, qualquer coisa), esta linha é a única pista
      de qual conta ficou órfã no provedor. Sem ela, a recuperação seria
      comparar a lista de subcontas do painel com a nossa tabela, na mão.

      O `id` não é segredo: é o mesmo que aparece no painel do Asaas. A
      chave, essa sim, nunca é registrada.
    */
    this.logger.warn(
      `Subconta ${subconta.id} criada no Asaas para "${dados.nome}" (${dados.cpfCnpj}). Se nao houver uma linha de confirmacao logo abaixo desta, ela ficou ORFA no provedor. Subconta nao-BaaS encerrada em ate 48 HORAS da criacao, e que nunca fez login, nao gera a taxa de criacao: e a janela para desfazer sem custo.`,
    );

    if (!subconta.walletId) {
      throw new BadRequestException(
        "O Asaas criou a subconta mas não devolveu o walletId: sem ele não há split. Confira a conta no painel antes de tentar de novo, para não criar duas.",
      );
    }

    /*
      A chave pode vir em dois lugares, e as duas paginas da
      documentacao se contradizem: o guia diz `apiKey` no topo, o schema
      da referencia diz `accessToken.apiKey`. Ler so um dos dois
      gravaria `null` em silencio, e a chave nao se repete.
    */
    const chave = subconta.accessToken?.apiKey ?? subconta.apiKey;

    /*
      Se nao vier em nenhum dos dois, a subconta ainda serve para
      receber split; o que nao da e emitir cobranca em nome dela, que e
      o unico modelo com custodia. Falhar aqui jogaria fora uma subconta
      ja criada, que e pior -- e, ao contrario do que esta classe
      supunha antes, a perda nao e definitiva: da para criar uma chave
      nova com `POST /v3/accounts/{id}/accessTokens`, que fica bloqueado
      por padrao e precisa ser liberado na interface web do Asaas, com
      validade de 2 horas.
    */
    const cifrada = chave ? this.secretCipher.encrypt(chave, "subconta-asaas") : null;

    if (!cifrada) {
      this.logger.warn(
        `Subconta ${subconta.id} criada SEM chave na resposta, nem em apiKey nem em accessToken.apiKey. Ela recebe split, mas nao pode emitir cobranca propria, entao custodia fica indisponivel. Para destravar: liberar o acesso a chaves de API na interface do Asaas e criar uma chave nova para esta subconta.`,
      );
    }

    return {
      asaasAccountId: subconta.id,
      asaasWalletId: subconta.walletId,
      asaasApiKeyCifrada: cifrada,
    };
  }

  /**
   * O que o Asaas ainda espera desta subconta, e em que situação ela
   * está.
   *
   * ## Por que isto não saiu da criação
   *
   * Porque `onboardingUrl` não existe na resposta de `POST /v3/accounts`
   * — conferido no schema da referência em 20/10/2026. O link vive em
   * `GET /v3/myAccount/documents`, consultado **com a chave da
   * subconta**, e a documentação pede pelo menos 15 segundos depois da
   * criação. Era por isso que o botão "enviar os documentos" nunca
   * aparecia: o campo lido na criação vinha sempre vazio.
   *
   * ## Por que a situação vem junto
   *
   * `GET /v3/myAccount/status` responde "esta conta foi aprovada?" sem
   * depender de webhook nenhum. Enquanto os eventos de situação da conta
   * não estiverem marcados no painel do Asaas, é a única forma de o
   * estado sair de "em análise" — e marcar aquilo é tarefa de uma
   * pessoa, não do código.
   *
   * ## Por que nada aqui estoura
   *
   * Isto roda na leitura de uma tela. Uma indisponibilidade do Asaas, ou
   * uma subconta criada antes de o BaaS estar ligado, não pode derrubar a
   * tela de dinheiro da transportadora: sem resposta, o estado continua
   * sendo o que já estava gravado.
   */
  async sincronizar(conta: CompanyPaymentAccount): Promise<{
    onboardingUrl: string | null;
    situacaoGeral: string | null;
  }> {
    if (!conta.asaasApiKeyCifrada) return { onboardingUrl: null, situacaoGeral: null };

    const chave = this.chaveDaSubconta(conta, "consultar documentos e situacao da subconta");

    const [documentos, situacao] = await Promise.all([
      this.asaasClient
        .listarDocumentosPendentes(chave)
        .catch((erro: Error) => this.semResposta("documentos", conta, erro)),
      this.asaasClient
        .consultarSituacaoDaConta(chave)
        .catch((erro: Error) => this.semResposta("situacao", conta, erro)),
    ]);

    return {
      /* O primeiro link serve: a tela manda a pessoa para o fluxo do
         Asaas, que lista lá dentro tudo o que falta. */
      onboardingUrl:
        documentos?.find((documento) => documento.onboardingUrl)?.onboardingUrl ?? null,
      situacaoGeral: situacao?.general ?? null,
    };
  }

  private semResposta(oQue: string, conta: CompanyPaymentAccount, erro: Error): null {
    this.logger.warn(
      `Nao foi possivel consultar ${oQue} da subconta ${conta.asaasAccountId} (empresa ${conta.companyId}): ${erro.message}. O estado gravado continua valendo.`,
    );
    return null;
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
