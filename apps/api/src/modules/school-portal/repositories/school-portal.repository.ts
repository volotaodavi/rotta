import type { SchoolAdministrativeDependency, SchoolStaffRole, UserStatus } from "@prisma/client";

/** O mínimo da escola para decidir se ela pode ter Portal e como se chama na tela. */
export interface EscolaDoPortal {
  id: string;
  nomeOficial: string;
  nomeFantasia: string | null;
  dependenciaAdministrativa: SchoolAdministrativeDependency;
}

/** Uma conta do Portal, já com o nome da escola resolvido. */
export interface ContaDoPortal {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  escolaPapel: SchoolStaffRole | null;
  status: UserStatus;
  escolaId: string | null;
  createdAt: Date;
  escola: { nomeOficial: string; nomeFantasia: string | null } | null;
}

/** O bastante para decidir se o ator pode mexer nesta conta. */
export interface ContaDoPortalResumida {
  id: string;
  escolaId: string | null;
  escolaPapel: SchoolStaffRole | null;
  escola: { nomeOficial: string; nomeFantasia: string | null } | null;
}

/** Um aluno da escola com os eventos de viagem de HOJE, em ordem cronológica. */
export interface AlunoComEventosDoDia {
  id: string;
  nome: string;
  dataNascimento: Date;
  turno: string;
  eventosViagem: {
    tipo: string;
    processadoEm: Date;
    trip: {
      id: string;
      status: string;
      sentido: string;
      route: { id: string; nome: string };
      veiculo: { placa: string; modelo: string };
      company: { nomeFantasia: string };
    };
  }[];
}

/**
 * As consultas do Portal da Escola.
 *
 * ## Por que um repositório próprio, e não os de Schools/Students
 *
 * Aqueles se isolam por `companyId` — são a visão da TRANSPORTADORA.
 * O Portal responde outra pergunta, com outro escopo: "quais dos MEUS
 * alunos estão no ônibus hoje, venham de qual transportadora vierem".
 * Reusar as consultas de lá traria o isolamento errado junto, que é
 * como vazamento entre tenants costuma nascer.
 *
 * ## O bypass, e o que o mantém restrito
 *
 * Todo método faz `PrismaService.withBypass(...)` porque quem consulta
 * é `Role.ESCOLA`, que não pertence a tenant nenhum — a RLS por
 * `companyId` não tem o que filtrar para ele. O que substitui a RLS
 * aqui é o `escolaId`, que TODO método recebe e põe no `where`. Ele
 * vem do token (`AuthenticatedUser.escolaId`), nunca do corpo da
 * requisição: é o filtro que sustenta o isolamento inteiro do módulo.
 */
export interface SchoolPortalRepository {
  findEscola(escolaId: string): Promise<EscolaDoPortal | null>;
  /** As contas de uma escola, diretores primeiro e depois por nome. */
  listContas(escolaId: string): Promise<ContaDoPortal[]>;
  findContaById(contaId: string): Promise<ContaDoPortalResumida | null>;
  /**
   * Os alunos da escola com os eventos de viagem de um dia.
   *
   * Um `findMany` só, com os eventos e a viagem embutidos: buscar aluno
   * por aluno seriam centenas de consultas na hora de pico da saída.
   */
  listAlunosComEventosDoDia(escolaId: string, dia: Date): Promise<AlunoComEventosDoDia[]>;
}
