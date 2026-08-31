import { Injectable } from "@nestjs/common";

import type {
  StudentAddressOverrideRepository,
  UpsertStudentAddressOverrideData,
} from "./student-address-override.repository";
import type { StudentAddressOverride } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaStudentAddressOverrideRepository implements StudentAddressOverrideRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(data: UpsertStudentAddressOverrideData): Promise<StudentAddressOverride> {
    const {
      studentId,
      data: dia,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      latitude,
      longitude,
      horarioAlternativo,
      ...resto
    } = data;
    // `?? null` em todo campo opcional (não `undefined`) — um upsert que
    // troca `localTipo` de OUTRO pra RESIDENCIA/ESCOLA precisa LIMPAR o
    // endereço antigo, não deixá-lo esquecido (Prisma ignora `undefined`
    // num `update`, mas escreve `null` de verdade).
    const camposOpcionais = {
      cep: cep ?? null,
      logradouro: logradouro ?? null,
      numero: numero ?? null,
      complemento: complemento ?? null,
      bairro: bairro ?? null,
      cidade: cidade ?? null,
      estado: estado ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      horarioAlternativo: horarioAlternativo ?? null,
    };
    return this.prisma.studentAddressOverride.upsert({
      where: { studentId_data: { studentId, data: dia } },
      create: { studentId, data: dia, ...resto, ...camposOpcionais },
      update: { ...resto, ...camposOpcionais },
    });
  }

  findById(id: string): Promise<StudentAddressOverride | null> {
    return this.prisma.studentAddressOverride.findUnique({ where: { id } });
  }

  findByStudentAndDate(studentId: string, data: Date): Promise<StudentAddressOverride | null> {
    return this.prisma.studentAddressOverride.findUnique({
      where: { studentId_data: { studentId, data } },
    });
  }

  listByStudent(studentId: string, from?: Date, to?: Date): Promise<StudentAddressOverride[]> {
    return this.prisma.studentAddressOverride.findMany({
      where: {
        studentId,
        ...((from ?? to) && { data: { gte: from, lte: to } }),
      },
      orderBy: { data: "asc" },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.studentAddressOverride.delete({ where: { id } });
  }
}
