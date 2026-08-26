import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  toClaimStudentPreRegistrationResponseDto,
  toStudentPreRegistrationLookupResponseDto,
  toStudentPreRegistrationResponseDto,
} from "./mappers/student-pre-registration.mapper";
import { STUDENT_PRE_REGISTRATION_REPOSITORY } from "./student-pre-registrations.constants";

import type { CompanyPreviewResponseDto } from "./dto/company-preview-response.dto";
import type { CreateStudentPreRegistrationDto } from "./dto/create-student-pre-registration.dto";
import type { LookupStudentPreRegistrationQueryDto } from "./dto/lookup-student-pre-registration-query.dto";
import type {
  ClaimStudentPreRegistrationResponseDto,
  ListStudentPreRegistrationsResponseDto,
  StudentPreRegistrationLookupResponseDto,
  StudentPreRegistrationResponseDto,
} from "./dto/student-pre-registration-response.dto";
import type { StudentPreRegistrationRepository } from "./repositories/student-pre-registration.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { CompanyRepository } from "@/modules/companies/repositories/company.repository";

import { COMPANY_REPOSITORY } from "@/modules/companies/companies.constants";

/**
 * Pré-cadastro de aluno + responsável pela transportadora (pedido do
 * usuário — ver nota completa em `StudentPreRegistration`, schema.prisma).
 * Duas pontas bem separadas: `create`/`listByCompany`/`cancel` são da
 * Empresa/Gestor (tenant já resolvido, `withTenant`); `lookup`/`claim`
 * são do Responsável ANTES de ter qualquer vínculo — igual a
 * `CompanyJoinRequestsService`, resolve o `Company` pelo
 * `codigoInterno` público e opera com `withBypass` por baixo.
 */
@Injectable()
export class StudentPreRegistrationsService {
  constructor(
    @Inject(STUDENT_PRE_REGISTRATION_REPOSITORY)
    private readonly repository: StudentPreRegistrationRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
  ) {}

  /** Só dígitos — "(11) 98888-7777", "11988887777" e "+55 11 98888-7777" precisam bater no mesmo registro. */
  private normalizeCelular(celular: string): string {
    return celular.replace(/\D/g, "");
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateStudentPreRegistrationDto,
  ): Promise<StudentPreRegistrationResponseDto> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }
    const created = await this.repository.create({
      companyId: actor.tenantId,
      criadoPorId: actor.sub,
      nomeAluno: dto.nomeAluno.trim(),
      nomeResponsavel: dto.nomeResponsavel.trim(),
      celularResponsavel: this.normalizeCelular(dto.celularResponsavel),
    });
    return toStudentPreRegistrationResponseDto(created);
  }

  async listByCompany(actor: AuthenticatedUser): Promise<ListStudentPreRegistrationsResponseDto> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }
    const items = await this.repository.listByCompany(actor.tenantId);
    return { items: items.map(toStudentPreRegistrationResponseDto) };
  }

  async cancel(actor: AuthenticatedUser, id: string): Promise<StudentPreRegistrationResponseDto> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }
    // RLS (`withTenant`) já restringe `findById` à própria empresa do
    // ator — um `id` de outra empresa simplesmente não aparece, mesmo
    // não-enumeração de `StudentsService.fetchOrThrow`.
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Pré-cadastro não encontrado.");
    }
    if (existing.status !== "PENDENTE") {
      throw new BadRequestException("Este pré-cadastro já foi reivindicado ou cancelado.");
    }
    const cancelled = await this.repository.cancel(id);
    return toStudentPreRegistrationResponseDto(cancelled);
  }

  /**
   * Prévia pública da transportadora, independente de haver ou não
   * pré-cadastro pendente (pedido do usuário, área pública de convite:
   * "vai aparecer a transportadora que ela está se credenciando").
   * `null` quando o código não existe/não está ativo — nunca 404
   * barulhento, mesma disciplina de `lookup`.
   */
  async previewCompanyByCodigo(
    codigoInternoRaw: string,
  ): Promise<CompanyPreviewResponseDto | null> {
    const codigoInterno = codigoInternoRaw.trim().toUpperCase();
    if (!codigoInterno) return null;
    const company = await this.companyRepository.findActiveByCodigoInterno(codigoInterno);
    return company ? { companyId: company.id, companyName: company.nomeFantasia } : null;
  }

  /**
   * "Código único do transporte" + celular (pedido do usuário) —
   * devolve `null` (nunca um erro 404 barulhento) quando não bate nada,
   * pra tela sempre poder oferecer o caminho "Corrigir" (cadastro do
   * zero) sem parecer um bug.
   */
  async lookup(
    dto: LookupStudentPreRegistrationQueryDto,
  ): Promise<StudentPreRegistrationLookupResponseDto | null> {
    const codigoInterno = dto.codigoInterno.trim().toUpperCase();
    const company = await this.companyRepository.findActiveByCodigoInterno(codigoInterno);
    if (!company) return null;

    const celular = this.normalizeCelular(dto.celular);
    const found = await this.repository.findPendingByCompanyAndCelular(company.id, celular);
    return found ? toStudentPreRegistrationLookupResponseDto(found) : null;
  }

  /**
   * "Continuar" (pedido do usuário: "a pessoa deve clicar e
   * automaticamente... vai colocar o devido pino no mapa") — reivindica
   * o pré-cadastro pro Responsável autenticado; a tela de cadastro
   * completo (`POST /students` com `preRegistrationId`) é quem
   * efetivamente cria o `Student` e chama `markConcluded`.
   */
  async claim(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<ClaimStudentPreRegistrationResponseDto> {
    const existing = await this.repository.findByIdWithCompany(id);
    if (!existing) {
      throw new NotFoundException("Pré-cadastro não encontrado.");
    }
    if (existing.status !== "PENDENTE") {
      throw new BadRequestException("Este pré-cadastro já foi reivindicado por outra pessoa.");
    }
    const claimed = await this.repository.claim(id, {
      status: "RECLAMADO",
      reclamadoPorId: actor.sub,
      reclamadoEm: new Date(),
    });
    return toClaimStudentPreRegistrationResponseDto({ ...existing, ...claimed });
  }
}
