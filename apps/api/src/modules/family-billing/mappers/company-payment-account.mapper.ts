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
/**
 * O que a Rotta já sabe e vai mandar ao provedor, para a tela mostrar
 * em vez de deixar implícito.
 *
 * ## Por que isto existe
 *
 * O formulário de abrir conta pede um campo, porque os outros oito
 * obrigatórios saem do cadastro da transportadora. Só que, da tela, um
 * formulário de um campo parece um formulário incompleto: a pessoa não
 * tem como saber que o CNPJ e o endereço dela já estão indo.
 *
 * Então vão escritos, do jeito que ela lê. É a mesma informação que o
 * `criarSubconta` monta, e por isso ela confere o que vai ser enviado
 * antes de enviar, em vez de confiar.
 *
 * Só aparece enquanto não há subconta. Depois de criada, não há mais o
 * que conferir.
 */
export interface DadosParaAbrirConta {
  /** Vai como `name`: tem que bater com o documento, então é a razão social. */
  razaoSocial: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  /** Uma linha, já escrita: "Avenida Roberto Silveira, 1180, Centro". */
  endereco: string;
  cep: string;
  /** `FISICA` para autônomo. Muda o que o provedor pede na análise. */
  tipoDePessoa: "JURIDICA" | "FISICA";
  /** O que o formulário ainda precisa perguntar, em linguagem de tela. */
  faltando: string[];
}

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

/**
 * A resposta de "para onde vai o dinheiro desta transportadora".
 *
 * ## Por que `conta` pode ser nula, e a resposta não
 *
 * Porque "ainda não tem conta de recebimento" é o estado de QUASE TODA
 * transportadora hoje, e é justamente quem mais precisa de resposta: é a
 * pessoa que tem que ver o que é a conta, o que muda com ela, e o que
 * falta para abrir.
 *
 * Antes este endpoint devolvia `null` inteiro nesse caso, e a tela não
 * tinha com o que montar o convite. Agora `conta: null` diz "não existe
 * ainda", e `dadosParaAbrirConta` diz o que já temos para abrir — as
 * duas informações que a tela precisa, na mesma resposta.
 */
export interface ContaDeRecebimentoComConviteResponse {
  conta: ContaDeRecebimentoResponse | null;
  /** Presente enquanto não há subconta: ver `DadosParaAbrirConta`. */
  dadosParaAbrirConta?: DadosParaAbrirConta;
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

/**
 * Monta o que a tela mostra antes de abrir a conta, a partir do cadastro
 * da transportadora.
 *
 * `faltando` é fixo em um item hoje, e é de propósito que seja uma lista:
 * no dia em que o provedor passar a exigir outro campo que a Rotta não
 * tem, é aqui que ele entra, e a tela não precisa mudar.
 */
export function toDadosParaAbrirConta(empresa: {
  razaoSocial: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cep: string;
  tipo: string;
}): DadosParaAbrirConta {
  const endereco = [
    empresa.endereco,
    empresa.numero,
    empresa.complemento || null,
    empresa.bairro,
  ].filter(Boolean);

  return {
    razaoSocial: empresa.razaoSocial,
    cpfCnpj: empresa.cpfCnpj,
    email: empresa.email,
    telefone: empresa.telefone,
    endereco: endereco.join(", "),
    cep: empresa.cep,
    tipoDePessoa: empresa.tipo === "AUTONOMO" ? "FISICA" : "JURIDICA",
    faltando: ["Faturamento mensal"],
  };
}
