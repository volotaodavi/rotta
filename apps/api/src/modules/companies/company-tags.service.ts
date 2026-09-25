import { ForbiddenException, Injectable } from "@nestjs/common";
import { ServiceTag } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * Tags de habilitação da transportadora — pedido do usuário
 * (25/09/2026): "empresa licitada deverá ter uma tag, para ter as
 * funcionalidades que somente a empresa licitada deve ter... toda e
 * qualquer empresa pode ter as duas tags, aí fica com todas as
 * funcionalidades existentes".
 *
 * ## Acumulativas, sempre
 *
 * Nenhum método aqui pergunta "qual é a vertente desta empresa?" —
 * essa pergunta não existe. A única pergunta válida é "esta empresa TEM
 * a tag X?", porque ter as duas é um caso normal: a mesma
 * transportadora atende a prefeitura de manhã e famílias à tarde.
 *
 * ## Por que um serviço, e não um `if` em cada lugar
 *
 * A mesma pergunta vai ser feita de telas e endpoints distantes. Com o
 * `if` espalhado, o dia em que uma terceira tag existir vira uma caça
 * a todos os lugares que assumiram que eram duas.
 *
 * ## O que este serviço NÃO faz
 *
 * Não sabe nada sobre dinheiro. Quem paga a Rotta é sempre a
 * transportadora, nas duas tags; a estrutura de receita é a RottaPay,
 * que o usuário vai desenhar. Tag habilita funcionalidade.
 */
@Injectable()
export class CompanyTagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * As tags da empresa.
   *
   * `withBypass` porque isto é lido de dentro de fluxos que rodam sob o
   * tenant da própria empresa consultada (`companies` tem RLS) e também
   * de listeners sem contexto de tenant nenhum. O `where` já restringe
   * ao `companyId` pedido, então o bypass não alarga nada — só permite
   * a leitura acontecer.
   *
   * Empresa inexistente devolve lista vazia, e não `[PRIVADA]`: quem
   * chama está prestes a decidir se LIBERA algo, e o padrão seguro
   * diante de uma empresa que não existe é não liberar.
   */
  async tags(companyId: string): Promise<ServiceTag[]> {
    const empresa = await this.prisma.withBypass(
      this.prisma.company.findUnique({ where: { id: companyId }, select: { tags: true } }),
    );
    return empresa?.tags ?? [];
  }

  async temTag(companyId: string, tag: ServiceTag): Promise<boolean> {
    return (await this.tags(companyId)).includes(tag);
  }

  /**
   * Barra uma ação que depende de uma tag que a empresa não tem.
   *
   * A mensagem nomeia a ação e a tag para o gestor entender que não é
   * erro de sistema — é uma funcionalidade que a habilitação dele não
   * inclui, e que o Admin da Rotta pode acrescentar.
   */
  async assertTag(companyId: string, tag: ServiceTag, acao: string): Promise<void> {
    if (await this.temTag(companyId, tag)) return;

    throw new ForbiddenException(
      `${acao} depende da habilitação "${ROTULO[tag]}", que esta transportadora não tem. ` +
        "O Admin da Rotta pode acrescentá-la no cadastro da empresa.",
    );
  }
}

/** O nome da tag como o gestor a conhece, para a mensagem de erro ser legível. */
const ROTULO: Record<ServiceTag, string> = {
  [ServiceTag.LICITADA]: "Licitada (contrato com município)",
  [ServiceTag.PRIVADA]: "Particular (contratada pelas famílias)",
};
