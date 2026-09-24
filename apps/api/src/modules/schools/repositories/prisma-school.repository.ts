import { Injectable } from "@nestjs/common";

import type {
  CreateSchoolData,
  ListSchoolsFilter,
  ListSchoolsResult,
  MunicipioDoCatalogo,
  SchoolRepository,
  UpdateSchoolData,
} from "./school.repository";
import type { Prisma, School, SchoolStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { normalizarMunicipio } from "@/shared/utils/municipio.util";

/**
 * `schools` não tem RLS (catálogo compartilhado — ver nota de
 * arquitetura no model `School`, `schema.prisma`): todo método aqui
 * lê/escreve diretamente via `this.prisma.school`, nunca
 * `withTenant`/`withBypass` (não há contexto de tenant para "escolher"
 * — a tabela é simplesmente visível a qualquer requisição autenticada).
 */
@Injectable()
export class PrismaSchoolRepository implements SchoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSchoolData, tx?: Prisma.TransactionClient): Promise<School> {
    const client = tx ?? this.prisma;
    return client.school.create({ data });
  }

  findById(id: string): Promise<School | null> {
    return this.prisma.school.findFirst({ where: { id, deletedAt: null } });
  }

  findByCodigoInep(codigoInep: string): Promise<School | null> {
    return this.prisma.school.findFirst({ where: { codigoInep } });
  }

  findManyByCodigosInep(codigosInep: string[]): Promise<School[]> {
    if (codigosInep.length === 0) return Promise.resolve([]);
    return this.prisma.school.findMany({ where: { codigoInep: { in: codigosInep } } });
  }

  update(id: string, data: UpdateSchoolData): Promise<School> {
    return this.prisma.school.update({ where: { id }, data });
  }

  async updateStatusBulk(fromStatus: SchoolStatus, toStatus: SchoolStatus): Promise<number> {
    const result = await this.prisma.school.updateMany({
      where: { status: fromStatus, deletedAt: null },
      data: { status: toStatus },
    });
    return result.count;
  }

  async list(filter: ListSchoolsFilter): Promise<ListSchoolsResult> {
    const where: Prisma.SchoolWhereInput = {
      deletedAt: filter.includeDeleted ? undefined : null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.cidade ? { cidade: { equals: filter.cidade, mode: "insensitive" } } : {}),
      ...(filter.estado ? { estado: { equals: filter.estado, mode: "insensitive" } } : {}),
      ...(filter.redeEnsino
        ? { redeEnsino: { equals: filter.redeEnsino, mode: "insensitive" } }
        : {}),
      ...(filter.tipo ? { tipos: { has: filter.tipo } } : {}),
      ...(filter.turno ? { turnosAtendidos: { has: filter.turno } } : {}),
      ...(filter.companyId
        ? { vinculosEmpresa: { some: { companyId: filter.companyId, desvinculadoEm: null } } }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { nomeOficial: { contains: filter.search, mode: "insensitive" } },
              { nomeFantasia: { contains: filter.search, mode: "insensitive" } },
              { codigoInep: { contains: filter.search, mode: "insensitive" } },
              { codigoInterno: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // `vinculosEmpresa` (usado acima quando `filter.companyId` é passado) é
    // uma relação com `school_company_links`, que TEM RLS por `companyId`
    // (ao contrário de `schools`). Sem `withBypass`, essa junção rodaria
    // fora de qualquer contexto de tenant/bypass e a policy escondería
    // todas as linhas (`current_setting(...) IS NULL`), zerando o filtro
    // mesmo para o próprio dono do vínculo. O `where` acima já restringe
    // explicitamente por `companyId`, então o bypass aqui não vaza dados
    // de outras empresas — só permite que a junção "enxergue" a tabela.
    const [items, total] = filter.companyId
      ? await Promise.all([
          this.prisma.withBypass(
            this.prisma.school.findMany({
              where,
              orderBy: { [filter.sortBy]: filter.sortOrder },
              skip: (filter.page - 1) * filter.pageSize,
              take: filter.pageSize,
            }),
          ),
          this.prisma.withBypass(this.prisma.school.count({ where })),
        ])
      : await Promise.all([
          this.prisma.school.findMany({
            where,
            orderBy: { [filter.sortBy]: filter.sortOrder },
            skip: (filter.page - 1) * filter.pageSize,
            take: filter.pageSize,
          }),
          this.prisma.school.count({ where }),
        ]);

    return { items, total };
  }

  /**
   * `tokens` já vêm normalizados/tokenizados pelo chamador
   * (`school-fuzzy-search.util.ts`) — cada um vira um `contains`
   * `insensitive` OR'd contra `nomeOficial`/`nomeFantasia`. Deliberadamente
   * mais permissivo que `list({ search })`: um único token batendo já
   * inclui a escola no conjunto de candidatas (a REORDENAÇÃO por
   * similaridade, feita depois em memória, é quem decide o que sobe pro
   * topo — este método só evita escanear a tabela inteira).
   */
  searchCandidates(tokens: string[], limit: number): Promise<School[]> {
    if (tokens.length === 0) return Promise.resolve([]);
    return this.prisma.school.findMany({
      where: {
        deletedAt: null,
        OR: tokens.flatMap((token) => [
          { nomeOficial: { contains: token, mode: "insensitive" as const } },
          { nomeFantasia: { contains: token, mode: "insensitive" as const } },
        ]),
      },
      take: limit,
    });
  }

  listAllActive(companyId?: string): Promise<School[]> {
    const where: Prisma.SchoolWhereInput = {
      deletedAt: null,
      status: "ATIVA",
      ...(companyId ? { vinculosEmpresa: { some: { companyId, desvinculadoEm: null } } } : {}),
    };

    // Mesmo motivo do `withBypass` em `list()` acima: a junção com
    // `school_company_links` exige contexto de RLS explícito.
    return companyId
      ? this.prisma.withBypass(this.prisma.school.findMany({ where }))
      : this.prisma.school.findMany({ where });
  }

  /**
   * Os municípios da UF que têm escola ativa, com a contagem de cada
   * um — em UMA consulta agregada, nunca trazendo as escolas.
   *
   * ## O tamanho real do problema
   *
   * O catálogo passa de 100 mil escolas. Trazer as linhas para contar
   * municípios seria carregar até ~50 mil registros só para descobrir
   * que SP tem 645 municípios. O `groupBy` devolve no máximo uma linha
   * por grafia distinta — 853 em Minas, que é a pior UF do país.
   *
   * ## Por que agrupa por DUAS colunas
   *
   * `cidadeNormalizada` é a chave (é ela que casa "Maricá" com
   * "MARICA"), mas quem aparece na tela é `cidade`, com acento. Como a
   * mesma cidade pode ter várias grafias na base (planilhas diferentes,
   * anos diferentes do Censo), o agrupamento traz as duas e a fusão
   * abaixo escolhe a grafia mais comum como rótulo — somando as
   * contagens, para que o total exibido seja o total que o
   * credenciamento vai pegar.
   */
  async listMunicipios(estado: string): Promise<MunicipioDoCatalogo[]> {
    const uf = estado.trim().toUpperCase();

    const grupos = await this.prisma.school.groupBy({
      by: ["cidade", "cidadeNormalizada"],
      where: { estado: uf, deletedAt: null, status: "ATIVA" },
      _count: { _all: true },
    });

    // `escolasDaGrafia` guarda quantas escolas tem a grafia ESCOLHIDA
    // como rótulo, separado de `escolas`, que é o total somado de todas
    // as grafias. Sem essa separação não dá para comparar uma grafia
    // nova contra a campeã atual — só contra a soma, que cresce a cada
    // iteração e faria a última grafia lida vencer sempre.
    const porChave = new Map<string, MunicipioDoCatalogo & { escolasDaGrafia: number }>();

    for (const grupo of grupos) {
      // A coluna é gerada pelo banco e nunca deveria vir nula, mas o
      // tipo é anulável — e recalcular aqui custa nada. Os dois
      // cálculos concordam por construção (ver `municipio.util.ts`).
      const chave = grupo.cidadeNormalizada ?? normalizarMunicipio(grupo.cidade);
      if (!chave) continue;

      const escolas = grupo._count._all;
      const atual = porChave.get(chave);

      if (!atual) {
        porChave.set(chave, {
          cidade: grupo.cidade,
          estado: uf,
          cidadeNormalizada: chave,
          escolas,
          escolasDaGrafia: escolas,
        });
        continue;
      }

      atual.escolas += escolas;
      // A grafia que aparece em mais escolas vence — é a que o Admin
      // reconhece como "o nome da cidade".
      if (escolas > atual.escolasDaGrafia) {
        atual.cidade = grupo.cidade;
        atual.escolasDaGrafia = escolas;
      }
    }

    return [...porChave.values()]
      .map(({ escolasDaGrafia: _ignorado, ...municipio }) => municipio)
      .sort((a, b) => a.cidade.localeCompare(b.cidade, "pt-BR"));
  }

  async nextCodigoInternoSequence(): Promise<number> {
    const [result] = await this.prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('schools_codigo_interno_seq')`;
    if (!result) {
      throw new Error("Falha ao gerar código interno da escola (sequência indisponível).");
    }
    return Number(result.nextval);
  }
}
