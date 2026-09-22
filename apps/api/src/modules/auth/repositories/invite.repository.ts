import type { Company, Invite, Prisma, School } from "@prisma/client";

/**
 * Repository Pattern (Dossie 12, Secao 6.1) — `invites` tem RLS por
 * `companyId` (mesma politica de `companies`/`memberships`). `findByCodigo`
 * e a unica operacao chamada fora de um tenant conhecido (resgate
 * publico de convite, Dossie 15 `AUTH-01-A1`) — o chamador
 * (`InvitesService`) e responsavel por rodar dentro de
 * `PrismaService.runInBypassTransaction`, nunca esta interface por si so.
 */
export interface CreateInviteInput {
  companyId: string;
  role: string;
  codigo: string;
  criadoPorId: string;
  expiresAt: Date;
  /** Portal da Escola — presente só em convite `Role.ESCOLA` (ver `InvitesService.createInvite`). */
  schoolId?: string | null;
}

/**
 * `school` vem junto porque o preview de um convite `Role.ESCOLA`
 * precisa mostrar o nome da ESCOLA, não o da transportadora que
 * convidou — ver `InvitePreviewResponseDto.schoolName`. É `null` em
 * todo convite que não seja de escola.
 */
export type InviteWithCompany = Invite & { company: Company; school: School | null };

export interface InviteRepository {
  create(input: CreateInviteInput, tx?: Prisma.TransactionClient): Promise<Invite>;
  /** Sempre inclui `company` — todo chamador precisa do nome da empresa (preview/redeem). */
  findByCodigo(codigo: string, tx?: Prisma.TransactionClient): Promise<InviteWithCompany | null>;
  listActiveByCompany(companyId: string): Promise<Invite[]>;
  markUsed(id: string, usadoPorId: string, tx?: Prisma.TransactionClient): Promise<Invite>;
  revoke(id: string): Promise<Invite>;
}
