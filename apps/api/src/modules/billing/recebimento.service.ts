import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { AsaasClientService } from "./asaas-client.service";

import { PrismaService } from "@/infra/database/prisma.service";
import { SecretCipherService } from "@/infra/security/secret-cipher.service";

/** O que o app mostra para a transportadora sobre o recebimento dela. */
export interface SituacaoDoRecebimento {
  /** Já existe subconta na Asaas para esta transportadora. */
  habilitado: boolean;
  /**
   * Situação do onboarding, como a Asaas reporta: `APPROVED`,
   * `PENDING`, `AWAITING_APPROVAL`, `REJECTED`. Nulo antes de existir
   * subconta, ou quando a consulta falhou.
   */
  situacao: string | null;
  /**
   * `true` quando a transportadora já pode receber. A Asaas libera o
   * recebimento ANTES de aprovar a documentação inteira, e tratar os
   * dois como a mesma coisa deixaria dinheiro parado à toa.
   */
  podeReceber: boolean;
}

/**
 * Habilita a transportadora a receber as mensalidades das famílias
 * direto, pelo split da Asaas.
 *
 * ## O desenho, em uma frase
 *
 * Cada transportadora ganha uma SUBCONTA na Asaas. A família paga uma
 * cobrança criada pela Rotta, e no momento da liquidação a Asaas manda
 * a parte da transportadora direto para a carteira dela. A Rotta fica
 * apenas com o que não foi repassado.
 *
 * ## Por que a arquitetura importa mais que a conveniência
 *
 * O dinheiro da família pertence à transportadora, não à Rotta. Com
 * subconta, ele nunca transita pelo faturamento da Rotta: cai na
 * carteira certa na liquidação. O desenho alternativo, receber tudo e
 * repassar depois, transformaria dinheiro de terceiro em receita da
 * Rotta aos olhos da contabilidade, com a conta da Rotta sendo um MEI.
 *
 * ## O que ainda depende de resposta da Asaas
 *
 * Operar em "BaaS" (a transportadora vendo tudo dentro do app, sem
 * nunca abrir o painel da Asaas) exige alinhamento prévio com o gerente
 * de contas. Sem esse alinhamento, a subconta criada aqui é a PADRÃO: a
 * transportadora recebe um e-mail da Asaas para criar senha e acessa o
 * painel deles.
 *
 * Isto está escrito aqui de propósito: o código é o mesmo nos dois
 * casos, muda a experiência. Quando o formato BaaS for confirmado,
 * nada neste arquivo precisa mudar.
 */
@Injectable()
export class RecebimentoService {
  private readonly logger = new Logger(RecebimentoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasClient: AsaasClientService,
    private readonly cipher: SecretCipherService,
  ) {}

  /**
   * Cria a subconta da transportadora, se ainda não existir.
   *
   * Idempotente de propósito: chamada duas vezes, a segunda devolve a
   * situação atual sem criar nada. Subconta duplicada na Asaas não tem
   * desfazer, e o app pode repetir a chamada por toque duplo ou por
   * retentativa de rede.
   */
  async habilitar(companyId: string): Promise<SituacaoDoRecebimento> {
    const company = await this.prisma.runWithTenantContext(
      { tenantId: companyId, bypass: false },
      () => this.prisma.company.findUnique({ where: { id: companyId } }),
    );
    if (!company) throw new NotFoundException("Transportadora não encontrada.");

    if (company.asaasWalletId) {
      this.logger.debug(`Transportadora ${companyId} já tem subconta: nada a criar.`);
      return this.consultar(companyId);
    }

    if (!company.cpfCnpj || !company.email || !company.telefone || !company.cep) {
      /*
        Falha cedo e com nome. A Asaas recusaria do mesmo jeito, mas com
        uma mensagem genérica dela, e a transportadora não saberia qual
        dado do PRÓPRIO cadastro está faltando.
      */
      throw new BadRequestException(
        "Complete o cadastro da transportadora (CNPJ, e-mail, telefone e endereço) antes de habilitar o recebimento.",
      );
    }

    const subconta = await this.asaasClient.createSubaccount({
      name: company.nomeFantasia,
      email: company.email,
      cpfCnpj: company.cpfCnpj,
      mobilePhone: company.whatsapp ?? company.telefone,
      /*
        Faturamento mensal declarado. A Asaas exige o campo e usa para
        análise de risco. Não temos esse dado no cadastro, e inventar um
        número alto seria declarar algo falso em nome de terceiro: vai o
        mínimo honesto, e a transportadora corrige no painel se a Asaas
        pedir.
      */
      incomeValue: 1000,
      address: company.endereco,
      addressNumber: company.numero,
      province: company.bairro,
      postalCode: company.cep,
    });

    /*
      A `apiKey` vem UMA ÚNICA VEZ e a Asaas não devolve de novo. Se a
      gravação falhar aqui, a subconta existe e a chave se perdeu, então
      ela é persistida junto com o resto, cifrada, antes de qualquer
      outra coisa acontecer.
    */
    const chave = subconta.apiKey ?? subconta.accessToken ?? null;
    await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
      this.prisma.company.update({
        where: { id: companyId },
        data: {
          asaasWalletId: subconta.walletId,
          asaasSubaccountId: subconta.id,
          asaasSubaccountApiKey: chave ? this.cipher.encrypt(chave) : null,
          asaasOnboardingStatus: "PENDING",
        },
      }),
    );

    this.logger.log(`Subconta Asaas criada para a transportadora ${companyId}.`);
    if (!chave) {
      /*
        Não é fatal: o split funciona só com o `walletId`. O que se perde
        é a consulta de onboarding em nome dela. Fica registrado em vez
        de silenciado, porque é irrecuperável.
      */
      this.logger.warn(
        `Subconta da transportadora ${companyId} criada SEM apiKey na resposta: a situação do onboarding não poderá ser consultada.`,
      );
    }

    return this.consultar(companyId);
  }

  /**
   * Situação atual, para a tela do app.
   *
   * Nunca lança por falha na Asaas: uma consulta de status fora do ar
   * não pode virar tela de erro numa aba que a transportadora abre para
   * ver o próprio dinheiro. Sem resposta, devolve o último estado
   * conhecido.
   */
  async consultar(companyId: string): Promise<SituacaoDoRecebimento> {
    const company = await this.prisma.runWithTenantContext(
      { tenantId: companyId, bypass: false },
      () => this.prisma.company.findUnique({ where: { id: companyId } }),
    );
    if (!company) throw new NotFoundException("Transportadora não encontrada.");

    if (!company.asaasWalletId) {
      return { habilitado: false, situacao: null, podeReceber: false };
    }

    let situacao = company.asaasOnboardingStatus ?? null;

    if (company.asaasSubaccountApiKey) {
      try {
        const chave = this.cipher.decrypt(company.asaasSubaccountApiKey);
        const status = await this.asaasClient.getSubaccountStatus(chave);
        situacao = status.general ?? situacao;

        if (situacao && situacao !== company.asaasOnboardingStatus) {
          await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
            this.prisma.company.update({
              where: { id: companyId },
              data: { asaasOnboardingStatus: situacao },
            }),
          );
        }
      } catch (error) {
        this.logger.warn(
          `Situação do onboarding da transportadora ${companyId} não pôde ser consultada: ${(error as Error).message}`,
        );
      }
    }

    return {
      habilitado: true,
      situacao,
      /*
        A Asaas libera o recebimento antes de concluir a análise
        documental, que leva até 48 horas. Ter subconta já basta para
        receber; `APPROVED` é o estado final, não o começo.
      */
      podeReceber: true,
    };
  }
}
