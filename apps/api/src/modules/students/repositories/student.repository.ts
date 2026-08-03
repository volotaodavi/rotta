import type { SchoolShift, Student, StudentSex } from "@prisma/client";

export interface CreateStudentData {
  responsavelId: string;
  nome: string;
  fotoUrl?: string;
  dataNascimento: Date;
  sexo: StudentSex;
  schoolId: string;
  turno: SchoolShift;
  embarqueCep: string;
  embarqueLogradouro: string;
  embarqueNumero: string;
  embarqueComplemento?: string;
  embarqueBairro: string;
  embarqueCidade: string;
  embarqueEstado: string;
  embarqueLatitude?: number;
  embarqueLongitude?: number;
  desembarqueCep: string;
  desembarqueLogradouro: string;
  desembarqueNumero: string;
  desembarqueComplemento?: string;
  desembarqueBairro: string;
  desembarqueCidade: string;
  desembarqueEstado: string;
  desembarqueLatitude?: number;
  desembarqueLongitude?: number;
  necessidadesEspeciais?: string;
  medicamentos?: string;
  observacoes?: string;
}

export type UpdateStudentData = Partial<Omit<CreateStudentData, "responsavelId">> & {
  deletedAt?: Date | null;
};

export interface ListStudentsFilter {
  /** Escopo do Responsável — sempre os PRÓPRIOS alunos, nunca de terceiros. */
  responsavelId?: string;
  /**
   * Escopo de Empresa/Gestor/Admin Rotta — apenas alunos com
   * `Contract` ATIVO com esta empresa (join contra `contracts`, que
   * TEM RLS — resolvido via `withBypass` explícito no repositório,
   * mesma lição aprendida em `PrismaSchoolRepository.list`).
   */
  companyId?: string;
  /**
   * Escopo de Motorista/Monitor — apenas alunos de um `Contract` ATIVO
   * onde este usuário é o motorista/monitor designado (briefing
   * "PERMISSÕES" do módulo Escolas, mesmo raciocínio aplicado aqui:
   * Rotas ainda não existe, então o vínculo real disponível hoje é o
   * do próprio Contrato).
   */
  motoristaOuMonitorId?: string;
  search?: string;
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
}

export interface ListStudentsResult {
  items: Student[];
  total: number;
}

/**
 * `students` NÃO tem RLS (pertence ao Responsável, não a uma Empresa —
 * ver nota de arquitetura no model `Student`, `schema.prisma`). O
 * escopo por Empresa/Motorista/Monitor (quando existe) vem do JOIN com
 * `contracts` via `companyId`/`motoristaOuMonitorId` no filtro de `list`.
 */
export interface StudentAccessScope {
  responsavelId?: string;
  companyId?: string;
  motoristaOuMonitorId?: string;
}

export interface StudentRepository {
  create(data: CreateStudentData): Promise<Student>;
  findById(id: string): Promise<Student | null>;
  /** Mesma junção com `contracts` de `list()` — usado por `fetchOrThrow` para decidir 404 vs. acesso liberado. */
  findByIdScoped(id: string, scope: StudentAccessScope): Promise<Student | null>;
  update(id: string, data: UpdateStudentData): Promise<Student>;
  list(filter: ListStudentsFilter): Promise<ListStudentsResult>;
}
