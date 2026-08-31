import type {
  StudentAddressOverride,
  StudentAddressOverrideLocalTipo,
  StudentAddressOverrideTrecho,
} from "@prisma/client";

export interface UpsertStudentAddressOverrideData {
  studentId: string;
  data: Date;
  trecho: StudentAddressOverrideTrecho;
  /** Frente 10(c) — ver doc do enum no schema. */
  localTipo: StudentAddressOverrideLocalTipo;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  latitude?: number;
  longitude?: number;
  /** Frente 10(c) — "embarque adiado", formato "HH:mm". */
  horarioAlternativo?: string;
  observacao?: string;
  criadoPorUserId: string;
}

/**
 * Sem RLS, mesma razão de `Student`/`StudentAuthorizedPerson` (metadado
 * do aluno, não da empresa transportadora). `upsert` por
 * `@@unique([studentId, data])` — o Responsável pode reabrir/editar o
 * desvio do mesmo dia quantas vezes quiser antes da viagem começar
 * (nunca acumula registros duplicados pro mesmo dia).
 */
export interface StudentAddressOverrideRepository {
  upsert(data: UpsertStudentAddressOverrideData): Promise<StudentAddressOverride>;
  findById(id: string): Promise<StudentAddressOverride | null>;
  findByStudentAndDate(studentId: string, data: Date): Promise<StudentAddressOverride | null>;
  listByStudent(studentId: string, from?: Date, to?: Date): Promise<StudentAddressOverride[]>;
  remove(id: string): Promise<void>;
}
