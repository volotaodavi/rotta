import type { StudentPreRegistration, StudentPreRegistrationStatus } from "@prisma/client";

export type StudentPreRegistrationWithCompany = StudentPreRegistration & {
  company: { id: string; nomeFantasia: string };
};

export interface CreateStudentPreRegistrationData {
  companyId: string;
  criadoPorId: string;
  nomeAluno: string;
  nomeResponsavel: string;
  celularResponsavel: string;
}

export interface ClaimStudentPreRegistrationData {
  status: StudentPreRegistrationStatus;
  reclamadoPorId: string;
  reclamadoEm: Date;
}

/**
 * `student_pre_registrations` tem RLS por `companyId` (mesmo padrão do
 * resto do Dossiê 8), mas — igual a `CompanyJoinRequestRepository` —
 * `lookupPendingByCompanyAndCelular`/`claim` são chamados pelo
 * Responsável, que ainda não tem tenant nenhum: usam
 * `PrismaService.withBypass`. `create`/`listByCompany`/`cancel` (do lado
 * da Empresa/Gestor) usam `withTenant`.
 */
export interface StudentPreRegistrationRepository {
  create(data: CreateStudentPreRegistrationData): Promise<StudentPreRegistration>;
  listByCompany(companyId: string): Promise<StudentPreRegistration[]>;
  findById(id: string): Promise<StudentPreRegistration | null>;
  cancel(id: string): Promise<StudentPreRegistration>;
  /** Só `status = PENDENTE` — um registro já reivindicado não aparece de novo pra outro celular igual. */
  findPendingByCompanyAndCelular(
    companyId: string,
    celularResponsavel: string,
  ): Promise<StudentPreRegistrationWithCompany | null>;
  findByIdWithCompany(id: string): Promise<StudentPreRegistrationWithCompany | null>;
  claim(id: string, data: ClaimStudentPreRegistrationData): Promise<StudentPreRegistration>;
  /** `StudentsService.create` — marca CONCLUIDO e amarra o `Student` recém-criado, sem relação Prisma formal. */
  markConcluded(id: string, studentId: string): Promise<StudentPreRegistration>;
}
