import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";

import type { CompanyServiceAreaResponseDto } from "./dto/company-service-area-response.dto";
import type { CreateCompanyServiceAreaDto } from "./dto/create-company-service-area.dto";
import type { CredenciarMunicipioResponseDto } from "./dto/credenciar-municipio-response.dto";
import type { CredenciarMunicipioDto } from "./dto/credenciar-municipio.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { School, SchoolAdministrativeDependency } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { Role } from "@/shared/enums";

/**
 * Área de atuação da transportadora — a vertente de transporte PÚBLICO
 * pedida pelo usuário em 22/09/2026:
 *
 *   "irei cadastrar a transportadora e colocar em qual município ela
 *    atuará ou quais escolas ela atuará (se é repartição pública ou
 *    privada), aí a transportadora só poderá se credenciar nas escolas
 *    daquele município."
 *
 * ## O que este módulo NÃO faz, e por quê
 *
 * Não dá exclusividade. Duas transportadoras podem ter Maricá na área e
 * as duas se credenciam — decisão explícita do usuário. A área responde
 * "onde esta empresa pode atuar", nunca "quem mais pode atuar aqui".
 * Um município de fornecedor único se modela cadastrando uma
 * transportadora só.
 *
 * Não muda nada para quem já usa o sistema. Empresa sem nenhuma área
 * continua podendo se credenciar em qualquer escola do catálogo —
 * é assim que o fluxo privado (a transportadora se cadastra sozinha e
 * procura escolas) segue intacto. O usuário foi explícito: "o fluxo
 * existente poderá permanecer o mesmo, só muda que terá essa vertente
 * também".
 */
@Injectable()
export class CompanyServiceAreasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cadastra uma área. Só Admin Rotta: é decisão de contrato público,
   * não de autoatendimento — se a própria empresa pudesse editar a
   * cerca, a cerca não cercaria nada.
   */
  async criar(
    companyId: string,
    dto: CreateCompanyServiceAreaDto,
    actor: AuthenticatedUser,
  ): Promise<CompanyServiceAreaResponseDto> {
    this.exigirAdminRotta(actor);

    const porMunicipio = Boolean(dto.cidade && dto.estado);
    const porEscola = Boolean(dto.schoolId);

    // "Exatamente um dos dois." Uma área sem alvo seria uma cerca que
    // não cerca nada; com os dois, seria ambígua sobre qual vale. O
    // banco também tem o CHECK — esta checagem existe para a mensagem
    // ser legível em vez de um erro de constraint.
    if (porMunicipio === porEscola) {
      throw new BadRequestException(
        "Informe um município (cidade + estado) OU uma escola específica — nunca os dois, nunca nenhum.",
      );
    }

    if (porEscola && dto.dependencias?.length) {
      throw new BadRequestException(
        "Filtro por rede só faz sentido em área de município: a escola específica já é a própria rede dela.",
      );
    }

    const area = await this.prisma.withBypass(
      this.prisma.companyServiceArea.create({
        data: {
          companyId,
          cidade: dto.cidade ?? null,
          estado: dto.estado ? dto.estado.toUpperCase() : null,
          schoolId: dto.schoolId ?? null,
          dependencias: dto.dependencias ?? [],
          criadoPorId: actor.sub,
        },
        include: { school: { select: { nomeOficial: true, nomeFantasia: true } } },
      }),
    );

    return this.toResponse(area);
  }

  async listar(
    companyId: string,
    actor: AuthenticatedUser,
  ): Promise<CompanyServiceAreaResponseDto[]> {
    // Leitura é mais frouxa que escrita de propósito: a própria
    // transportadora precisa enxergar a própria cerca para entender por
    // que um credenciamento foi recusado. Ninguém vê a área de outra.
    if (actor.role !== Role.ADMIN_ROTTA && actor.tenantId !== companyId) {
      throw new ForbiddenException("Área de atuação de outra transportadora.");
    }

    const areas = await this.prisma.withBypass(
      this.prisma.companyServiceArea.findMany({
        where: { companyId },
        include: { school: { select: { nomeOficial: true, nomeFantasia: true } } },
        orderBy: { createdAt: "asc" },
      }),
    );

    return areas.map((area) => this.toResponse(area));
  }

  async remover(companyId: string, areaId: string, actor: AuthenticatedUser): Promise<void> {
    this.exigirAdminRotta(actor);

    // `deleteMany` com o `companyId` no `where`, e não `delete` por id:
    // um id de área de OUTRA empresa simplesmente não apaga nada, em
    // vez de apagar a área errada.
    await this.prisma.withBypass(
      this.prisma.companyServiceArea.deleteMany({ where: { id: areaId, companyId } }),
    );
  }

  /**
   * Credencia a transportadora em TODAS as escolas de um município, de
   * uma vez (pedido do usuário 24/09/2026: "escolhendo a cidade da
   * prestadora de serviço, pegará TODAS as escolas daquele município já
   * colocadas no site pela planilha. Não deverá inventar ou faltar").
   *
   * As duas palavras finais do pedido são as duas garantias:
   *
   * - **Não inventar.** Só vincula escola que JÁ existe no catálogo.
   *   Nenhuma escola é criada aqui — se faltou alguma, o caminho é
   *   corrigir a planilha e reimportar, nunca deixar o sistema chutar.
   * - **Não faltar.** Pega todas as que casam com o município, sem
   *   paginação, e devolve a contagem para o Admin conferir contra o
   *   que ele sabe que subiu.
   *
   * Cria também a ÁREA DE ATUAÇÃO do município na mesma operação. Sem
   * isso, a empresa sairia credenciada nas 62 escolas de hoje mas sem
   * cerca nenhuma — e amanhã poderia se credenciar em qualquer escola
   * do país. Credenciar e delimitar são o mesmo gesto.
   *
   * Reexecutar é seguro: o que já estava vinculado é contado à parte,
   * não duplicado.
   */
  async credenciarMunicipio(
    companyId: string,
    dto: CredenciarMunicipioDto,
    actor: AuthenticatedUser,
  ): Promise<CredenciarMunicipioResponseDto> {
    this.exigirAdminRotta(actor);

    const cidade = dto.cidade.trim();
    const estado = dto.estado.trim().toUpperCase();
    const dependencias = dto.dependencias ?? [];

    // A comparação de município é feita em memória, e não no `where`,
    // porque precisa ignorar acento: "Maricá" digitado pelo Admin tem
    // de casar com "MARICA" vindo da planilha do INEP, e o Postgres só
    // faria isso com `unaccent` instalado — dependência de extensão que
    // esta operação não justifica. O `where` estreita por UF (barato e
    // exato) e o resto é filtrado aqui.
    const candidatas = await this.prisma.withBypass(
      this.prisma.school.findMany({
        where: {
          estado,
          deletedAt: null,
          status: "ATIVA",
          ...(dependencias.length > 0 ? { dependenciaAdministrativa: { in: dependencias } } : {}),
        },
        select: { id: true, cidade: true },
      }),
    );

    const alvo = candidatas.filter((escola) => normalizar(escola.cidade) === normalizar(cidade));

    const jaVinculadas = await this.prisma.withBypass(
      this.prisma.schoolCompanyLink.findMany({
        where: { companyId, desvinculadoEm: null, schoolId: { in: alvo.map((e) => e.id) } },
        select: { schoolId: true },
      }),
    );
    const idsJaVinculados = new Set(jaVinculadas.map((v) => v.schoolId));
    const novas = alvo.filter((escola) => !idsJaVinculados.has(escola.id));

    if (novas.length > 0) {
      await this.prisma.withBypass(
        this.prisma.schoolCompanyLink.createMany({
          data: novas.map((escola) => ({
            schoolId: escola.id,
            companyId,
            vinculadoPorId: actor.sub,
          })),
        }),
      );
    }

    const areaDeAtuacaoRegistrada = await this.garantirAreaDoMunicipio(
      companyId,
      cidade,
      estado,
      dependencias,
      actor.sub,
    );

    return {
      encontradas: alvo.length,
      credenciadas: novas.length,
      jaCredenciadas: idsJaVinculados.size,
      areaDeAtuacaoRegistrada,
    };
  }

  /**
   * Garante que existe a área de atuação deste município, sem duplicar
   * se o Admin rodar o credenciamento duas vezes.
   */
  private async garantirAreaDoMunicipio(
    companyId: string,
    cidade: string,
    estado: string,
    dependencias: SchoolAdministrativeDependency[],
    criadoPorId: string,
  ): Promise<boolean> {
    const existentes = await this.prisma.withBypass(
      this.prisma.companyServiceArea.findMany({ where: { companyId, estado } }),
    );
    const jaTem = existentes.some((area) => normalizar(area.cidade) === normalizar(cidade));
    if (jaTem) return true;

    await this.prisma.withBypass(
      this.prisma.companyServiceArea.create({
        data: { companyId, cidade, estado, dependencias, criadoPorId },
      }),
    );
    return true;
  }

  /**
   * O guard de credenciamento — chamado por `SchoolsService.linkCompany`.
   *
   * Empresa sem nenhuma área passa direto (fluxo privado de hoje). Com
   * área, a escola precisa caber em pelo menos uma delas.
   */
  async assertPodeCredenciar(companyId: string, school: School): Promise<void> {
    const areas = await this.prisma.withBypass(
      this.prisma.companyServiceArea.findMany({ where: { companyId } }),
    );

    // Sem cerca = comportamento de sempre. Esta linha é o que torna a
    // vertente pública ADITIVA em vez de uma ruptura.
    if (areas.length === 0) return;

    const cabe = areas.some((area) => this.escolaCabeNaArea(area, school));
    if (!cabe) {
      throw new ForbiddenException(
        `Esta transportadora não atua em ${school.cidade}/${school.estado}. Ajuste a área de atuação dela no painel da Rotta antes de credenciar.`,
      );
    }
  }

  private escolaCabeNaArea(
    area: {
      cidade: string | null;
      estado: string | null;
      schoolId: string | null;
      dependencias: SchoolAdministrativeDependency[];
    },
    school: School,
  ): boolean {
    if (area.schoolId) {
      return area.schoolId === school.id;
    }

    const mesmoMunicipio =
      normalizar(area.cidade) === normalizar(school.cidade) &&
      normalizar(area.estado) === normalizar(school.estado);
    if (!mesmoMunicipio) return false;

    // Lista vazia = todas as redes daquele município.
    if (area.dependencias.length === 0) return true;
    return area.dependencias.includes(school.dependenciaAdministrativa);
  }

  private exigirAdminRotta(actor: AuthenticatedUser): void {
    if (actor.role !== Role.ADMIN_ROTTA) {
      throw new ForbiddenException(
        "Só o Admin da Rotta define a área de atuação de uma transportadora.",
      );
    }
  }

  private toResponse(area: {
    id: string;
    companyId: string;
    cidade: string | null;
    estado: string | null;
    schoolId: string | null;
    dependencias: SchoolAdministrativeDependency[];
    createdAt: Date;
    school?: { nomeOficial: string; nomeFantasia: string | null } | null;
  }): CompanyServiceAreaResponseDto {
    return {
      id: area.id,
      companyId: area.companyId,
      cidade: area.cidade,
      estado: area.estado,
      schoolId: area.schoolId,
      schoolNome: area.school ? (area.school.nomeFantasia ?? area.school.nomeOficial) : null,
      dependencias: area.dependencias,
      createdAt: area.createdAt.toISOString(),
    };
  }
}

/**
 * "Maricá" digitado pelo Admin tem de casar com "MARICA" vindo da
 * planilha do INEP. Sem acento, sem caixa, sem espaço sobrando — a
 * comparação de município é a única coisa entre uma transportadora e o
 * credenciamento dela, e não pode falhar por cedilha.
 */
function normalizar(valor: string | null): string {
  if (!valor) return "";
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}
