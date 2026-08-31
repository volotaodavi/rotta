import type {
  StudentAddressOverrideRecurrence,
  StudentAddressOverrideTrecho,
} from "@prisma/client";

export interface CreateStudentAddressOverrideRecurrenceData {
  studentId: string;
  diasSemana: number[];
  vigenciaInicio: Date;
  vigenciaFim?: Date;
  trecho: StudentAddressOverrideTrecho;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  observacao?: string;
  criadoPorUserId: string;
}

/**
 * Frente 10(b) — regra de endereço alternativo RECORRENTE (pedido do
 * usuário: "na ocasionalidade ele pode escolher os dias que pode
 * mudar"). Sem RLS, mesma razão de `StudentAddressOverrideRepository`
 * (dado do aluno, não da empresa). Sem `upsert` por chave natural (ao
 * contrário do desvio de dia único): o Responsável pode ter várias
 * regras recorrentes simultâneas (ex. "toda terça" + "toda quinta, em
 * outro endereço"), então cada regra é um recurso independente
 * (criar/listar/remover), nunca substituída implicitamente.
 */
export interface StudentAddressOverrideRecurrenceRepository {
  create(
    data: CreateStudentAddressOverrideRecurrenceData,
  ): Promise<StudentAddressOverrideRecurrence>;
  findById(id: string): Promise<StudentAddressOverrideRecurrence | null>;
  listByStudent(studentId: string): Promise<StudentAddressOverrideRecurrence[]>;
  remove(id: string): Promise<void>;
}
