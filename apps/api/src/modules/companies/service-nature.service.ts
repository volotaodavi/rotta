import { ForbiddenException, Injectable } from "@nestjs/common";
import { ServiceNature } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * Quem PAGA pelo transporte — a separação entre as duas verticais
 * (pedido do usuário 25/09/2026: "faça a distinção, por favor. Não
 * quero mistura").
 *
 * ## As duas verticais, e o que muda entre elas
 *
 * | | `PRIVADO` | `PUBLICO_LICITADO` |
 * |---|---|---|
 * | Quem paga | o responsável | o município |
 * | Mensalidade | negociada, com valor | **não existe** |
 * | Como o aluno entra | solicitação → contrato assinado | autorização, sem negociação |
 * | Carteira da empresa | credita a mensalidade | nada a creditar |
 * | Painel da empresa | receita estimada | números de operação |
 *
 * ## O que NÃO muda
 *
 * Tudo que é operação: rotas, escala, rastreador, embarque, mapa,
 * notificação. O pai de Maricá acompanha o filho exatamente como o pai
 * de um contrato privado — a diferença é quem paga a conta, e isso não
 * pode vazar para a experiência dele.
 *
 * ## Por que um serviço, e não um `if` espalhado
 *
 * A pergunta "esta empresa cobra do responsável?" é feita de quatro
 * lugares distantes (marketplace, carteira, painel, credenciamento do
 * aluno). Espalhar o `if` garantiria que um deles ficasse para trás —
 * e o que fica para trás na vertente pública é sempre uma cobrança
 * indevida a um pai que não deve nada.
 */
@Injectable()
export class ServiceNatureService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A natureza declarada da empresa.
   *
   * `withBypass` porque isto é lido de dentro de fluxos que rodam sob o
   * tenant da PRÓPRIA empresa consultada (o `companies` tem RLS), e
   * também de listeners sem contexto de tenant nenhum. O `where` já
   * restringe ao `companyId` pedido, então o bypass não alarga nada —
   * só permite a leitura acontecer.
   *
   * Empresa inexistente devolve `PRIVADO`: quem chama aqui está sempre
   * prestes a decidir se COBRA ou não, e o padrão seguro de uma empresa
   * que não existe é seguir o caminho que já existia, nunca abrir a
   * exceção da gratuidade.
   */
  async natureza(companyId: string): Promise<ServiceNature> {
    const empresa = await this.prisma.withBypass(
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { naturezaServico: true },
      }),
    );
    return empresa?.naturezaServico ?? ServiceNature.PRIVADO;
  }

  async ehPublicoLicitado(companyId: string): Promise<boolean> {
    return (await this.natureza(companyId)) === ServiceNature.PUBLICO_LICITADO;
  }

  /**
   * Barra uma ação COMERCIAL numa empresa licitada.
   *
   * Não é zelo excessivo: o caminho bloqueado aqui termina num
   * responsável recebendo uma cobrança que o município já pagou. A
   * mensagem nomeia a ação para o gestor entender que não é erro de
   * sistema, é a vertente dele não ter esse gesto.
   */
  async assertCobrancaPermitida(companyId: string, acao: string): Promise<void> {
    if (await this.ehPublicoLicitado(companyId)) {
      throw new ForbiddenException(
        `${acao} não existe no transporte público licitado: o município custeia o serviço e o responsável nunca é cobrado. ` +
          "Se esta empresa passou a atender contratos particulares, o Admin da Rotta precisa mudar a natureza do serviço dela antes.",
      );
    }
  }
}
