import type { StudentAuthorizedPerson } from "@prisma/client";

export interface CreateStudentAuthorizedPersonData {
  studentId: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  parentesco?: string;
}

/** Sem RLS, mesma razão de `Student` (metadado do aluno, não da empresa). */
export interface StudentAuthorizedPersonRepository {
  create(data: CreateStudentAuthorizedPersonData): Promise<StudentAuthorizedPerson>;
  listByStudent(studentId: string): Promise<StudentAuthorizedPerson[]>;
  findById(id: string): Promise<StudentAuthorizedPerson | null>;
  remove(id: string): Promise<void>;
}
