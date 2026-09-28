import { Injectable } from "@nestjs/common";

import type {
  AlunoComEventosDoDia,
  ContaDoPortal,
  ContaDoPortalResumida,
  EscolaDoPortal,
  SchoolPortalRepository,
} from "./school-portal.repository";

import { PrismaService } from "@/infra/database/prisma.service";

/** O bypass e o que o mantém restrito estão explicados na interface. */
@Injectable()
export class PrismaSchoolPortalRepository implements SchoolPortalRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEscola(escolaId: string): Promise<EscolaDoPortal | null> {
    return this.prisma.withBypass(
      this.prisma.school.findFirst({
        where: { id: escolaId, deletedAt: null },
        select: {
          id: true,
          nomeOficial: true,
          nomeFantasia: true,
          dependenciaAdministrativa: true,
        },
      }),
    );
  }

  listContas(escolaId: string): Promise<ContaDoPortal[]> {
    return this.prisma.withBypass(
      this.prisma.user.findMany({
        where: { escolaId, deletedAt: null },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          escolaPapel: true,
          status: true,
          escolaId: true,
          createdAt: true,
          escola: { select: { nomeOficial: true, nomeFantasia: true } },
        },
        orderBy: [{ escolaPapel: "asc" }, { nome: "asc" }],
      }),
    );
  }

  findContaById(contaId: string): Promise<ContaDoPortalResumida | null> {
    return this.prisma.withBypass(
      this.prisma.user.findUnique({
        where: { id: contaId },
        select: {
          id: true,
          escolaId: true,
          escolaPapel: true,
          escola: { select: { nomeOficial: true, nomeFantasia: true } },
        },
      }),
    );
  }

  listAlunosComEventosDoDia(escolaId: string, dia: Date): Promise<AlunoComEventosDoDia[]> {
    return this.prisma.withBypass(
      this.prisma.student.findMany({
        where: {
          // O filtro que sustenta o isolamento inteiro deste módulo.
          schoolId: escolaId,
          deletedAt: null,
        },
        select: {
          id: true,
          nome: true,
          dataNascimento: true,
          turno: true,
          eventosViagem: {
            where: { trip: { data: dia } },
            select: {
              tipo: true,
              processadoEm: true,
              trip: {
                select: {
                  id: true,
                  status: true,
                  sentido: true,
                  route: { select: { id: true, nome: true } },
                  veiculo: { select: { placa: true, modelo: true } },
                  company: { select: { nomeFantasia: true } },
                },
              },
            },
            orderBy: { processadoEm: "asc" },
          },
        },
        orderBy: { nome: "asc" },
      }),
    );
  }
}
