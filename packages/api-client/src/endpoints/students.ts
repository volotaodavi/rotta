import { buildQueryString } from "../query.util";

import type { SchoolShift } from "./schools";
import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Alunos (briefing "Marketplace"
 * §"CADASTRO DO ALUNO") — espelham `apps/api/src/modules/students`.
 * `Student` é propriedade exclusiva do Responsável (sem `companyId`
 * próprio) — Empresa/Motorista/Monitor só têm leitura, escopada pelo
 * próprio backend via `Contract` ATIVO (nunca um parâmetro aqui).
 * `SchoolShift` é reaproveitado de `endpoints/schools.ts` (mesmo enum
 * do Prisma, já exportado por `index.ts` via `export * from
 * "./endpoints/schools"`) — nunca redeclarado nem reexportado aqui.
 */

export type StudentSex = "MASCULINO" | "FEMININO" | "OUTRO";

export interface CreateStudentInput {
  nome: string;
  dataNascimento: string;
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
  /** Fluxo "código do transporte + celular" (pedido do usuário) — ID do `StudentPreRegistration` reivindicado (`studentPreRegistrationsApi.claim`), caminho "Continuar". */
  preRegistrationId?: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

export interface Student {
  id: string;
  responsavelId: string;
  nome: string;
  fotoUrl: string | null;
  dataNascimento: string;
  sexo: StudentSex;
  schoolId: string;
  turno: SchoolShift;
  embarqueCep: string;
  embarqueLogradouro: string;
  embarqueNumero: string;
  embarqueComplemento: string | null;
  embarqueBairro: string;
  embarqueCidade: string;
  embarqueEstado: string;
  embarqueLatitude: number | null;
  embarqueLongitude: number | null;
  desembarqueCep: string;
  desembarqueLogradouro: string;
  desembarqueNumero: string;
  desembarqueComplemento: string | null;
  desembarqueBairro: string;
  desembarqueCidade: string;
  desembarqueEstado: string;
  desembarqueLatitude: number | null;
  desembarqueLongitude: number | null;
  necessidadesEspeciais: string | null;
  medicamentos: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListStudentsParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListStudentsResult {
  items: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateStudentAuthorizedPersonInput {
  nome: string;
  cpf?: string;
  telefone?: string;
  parentesco?: string;
}

export interface StudentAuthorizedPerson {
  id: string;
  studentId: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  parentesco: string | null;
  createdAt: string;
}

export interface StudentAuditLog {
  id: string;
  entidadeTipo: string;
  entidadeId: string;
  acao: string;
  atorUserId: string | null;
  dadosAntes: unknown;
  dadosDepois: unknown;
  createdAt: string;
}

export interface ListStudentAuditLogsResult {
  items: StudentAuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

/** `AMBOS` cobre embarque E desembarque do dia — o caso mais comum ("vou levar e buscar num endereço diferente hoje"). */
export type StudentAddressOverrideTrecho = "EMBARQUE" | "DESEMBARQUE" | "AMBOS";

/**
 * Endereço alternativo do responsável pra um dia específico (calendário
 * "Endereço do dia") — pedido do usuário: "informar se algum dia ele irá
 * para outro endereço". Só pode ser criado/editado/removido ANTES da
 * viagem daquele dia começar (o backend rejeita depois, com uma mensagem
 * clara — nunca falha silenciosamente).
 */
export interface StudentAddressOverride {
  id: string;
  studentId: string;
  data: string;
  trecho: StudentAddressOverrideTrecho;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertStudentAddressOverrideInput {
  data: string;
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
}

interface ApiEnvelope<T> {
  data: T;
}

export function createStudentsEndpoints(apiClient: ApiClient) {
  return {
    create: async (input: CreateStudentInput): Promise<Student> =>
      (
        await apiClient.request<ApiEnvelope<Student>>("/students", {
          method: "POST",
          body: input,
        })
      ).data,

    list: async (params: ListStudentsParams = {}): Promise<ListStudentsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListStudentsResult>>(
          `/students${buildQueryString(params)}`,
        )
      ).data,

    getById: async (id: string): Promise<Student> =>
      (await apiClient.request<ApiEnvelope<Student>>(`/students/${id}`)).data,

    update: async (id: string, input: UpdateStudentInput): Promise<Student> =>
      (
        await apiClient.request<ApiEnvelope<Student>>(`/students/${id}`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    remove: async (id: string): Promise<void> => {
      await apiClient.request(`/students/${id}`, { method: "DELETE" });
    },

    uploadPhoto: async (id: string, file: File | Blob): Promise<Student> => {
      const formData = new FormData();
      formData.append("file", file);
      return (
        await apiClient.request<ApiEnvelope<Student>>(`/students/${id}/photo`, {
          method: "POST",
          body: formData,
        })
      ).data;
    },

    listAuditLogs: async (
      id: string,
      page = 1,
      pageSize = 20,
    ): Promise<ListStudentAuditLogsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListStudentAuditLogsResult>>(
          `/students/${id}/audit-logs${buildQueryString({ page, pageSize })}`,
        )
      ).data,

    createAuthorizedPerson: async (
      id: string,
      input: CreateStudentAuthorizedPersonInput,
    ): Promise<StudentAuthorizedPerson> =>
      (
        await apiClient.request<ApiEnvelope<StudentAuthorizedPerson>>(
          `/students/${id}/authorized-persons`,
          { method: "POST", body: input },
        )
      ).data,

    listAuthorizedPersons: async (id: string): Promise<StudentAuthorizedPerson[]> =>
      (
        await apiClient.request<ApiEnvelope<StudentAuthorizedPerson[]>>(
          `/students/${id}/authorized-persons`,
        )
      ).data,

    removeAuthorizedPerson: async (id: string, personId: string): Promise<void> => {
      await apiClient.request(`/students/${id}/authorized-persons/${personId}`, {
        method: "DELETE",
      });
    },

    upsertAddressOverride: async (
      id: string,
      input: UpsertStudentAddressOverrideInput,
    ): Promise<StudentAddressOverride> =>
      (
        await apiClient.request<ApiEnvelope<StudentAddressOverride>>(
          `/students/${id}/address-overrides`,
          { method: "PUT", body: input },
        )
      ).data,

    listAddressOverrides: async (
      id: string,
      params: { from?: string; to?: string } = {},
    ): Promise<StudentAddressOverride[]> =>
      (
        await apiClient.request<ApiEnvelope<StudentAddressOverride[]>>(
          `/students/${id}/address-overrides${buildQueryString(params)}`,
        )
      ).data,

    removeAddressOverride: async (id: string, overrideId: string): Promise<void> => {
      await apiClient.request(`/students/${id}/address-overrides/${overrideId}`, {
        method: "DELETE",
      });
    },
  };
}

export type StudentsEndpoints = ReturnType<typeof createStudentsEndpoints>;
