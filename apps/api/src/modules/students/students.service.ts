import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationEventType, type Student } from "@prisma/client";

import { toStudentAuthorizedPersonResponseDto } from "./mappers/student-authorized-person.mapper";
import { toStudentResponseDto } from "./mappers/student.mapper";
import { STUDENT_AUTHORIZED_PERSON_REPOSITORY, STUDENT_REPOSITORY } from "./students.constants";

import type { CreateStudentAuthorizedPersonDto } from "./dto/create-student-authorized-person.dto";
import type { CreateStudentDto } from "./dto/create-student.dto";
import type { ListStudentsQueryDto } from "./dto/list-students-query.dto";
import type { StudentAuthorizedPersonResponseDto } from "./dto/student-authorized-person-response.dto";
import type { ListStudentsResponseDto, StudentResponseDto } from "./dto/student-response.dto";
import type { UpdateStudentDto } from "./dto/update-student.dto";
import type { StudentAuthorizedPersonRepository } from "./repositories/student-authorized-person.repository";
import type { StudentAccessScope, StudentRepository } from "./repositories/student.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { ListAuditLogsResponseDto } from "@/common/dto/audit-log-response.dto";

import { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const ENTIDADE_TIPO = "Student";

/**
 * Núcleo de negócio do módulo Alunos (briefing "Marketplace" §"CADASTRO
 * DO ALUNO"). DIFERENÇA CENTRAL frente a `SchoolsService`: aqui não há
 * papel de "gestão" cross-tenant — o Aluno é propriedade exclusiva do
 * Responsável que o cadastrou (`create`/`update`/`remove` sempre
 * `Role.RESPONSAVEL`, sempre o próprio); Empresa/Gestor/Motorista/
 * Monitor/Admin Rotta só têm LEITURA, escopada a alunos com `Contract`
 * ATIVO com a própria empresa (ou, no caso de Motorista/Monitor, onde
 * o próprio ator é o motorista/monitor designado no contrato).
 */
@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly studentRepository: StudentRepository,
    @Inject(STUDENT_AUTHORIZED_PERSON_REPOSITORY)
    private readonly authorizedPersonRepository: StudentAuthorizedPersonRepository,
    private readonly auditLogService: AuditLogService,
    private readonly storageService: SupabaseStorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
  ) {}

  private async recordAudit(input: {
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.record({ ...input, entidadeTipo: ENTIDADE_TIPO });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (Student ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Resolve o escopo de acesso pelo papel do ator — nunca confia em
   * nada vindo do cliente. `undefined` (só Admin Rotta) significa "sem
   * restrição", já que `students` não tem RLS.
   */
  private scopeForActor(actor: AuthenticatedUser): StudentAccessScope | undefined {
    if (actor.role === Role.ADMIN_ROTTA) return undefined;
    if (actor.role === Role.RESPONSAVEL) return { responsavelId: actor.sub };
    if (actor.role === Role.MOTORISTA || actor.role === Role.MONITOR) {
      return { motoristaOuMonitorId: actor.sub };
    }
    // EMPRESA/GESTOR
    return { companyId: actor.tenantId ?? undefined };
  }

  /** 404 (nunca 403) fora do escopo do ator — mesmo princípio de não-enumeração de `SchoolsService`. */
  private async fetchOrThrow(id: string, actor: AuthenticatedUser): Promise<Student> {
    const scope = this.scopeForActor(actor);
    const student = scope
      ? await this.studentRepository.findByIdScoped(id, scope)
      : await this.studentRepository.findById(id);
    if (!student) {
      throw new NotFoundException("Aluno não encontrado.");
    }
    return student;
  }

  private assertOwnedByActor(student: Student, actor: AuthenticatedUser): void {
    if (student.responsavelId !== actor.sub) {
      throw new ForbiddenException("Este aluno não pertence a você.");
    }
  }

  async create(
    dto: CreateStudentDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<StudentResponseDto> {
    const student = await this.studentRepository.create({
      ...dto,
      responsavelId: actor.sub,
      dataNascimento: new Date(dto.dataNascimento),
    });

    await this.recordAudit({
      entidadeId: student.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { nome: student.nome, schoolId: student.schoolId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const { titulo, corpo } = this.messagePersonalizationService.novoAluno(student.nome);
    this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
      userId: actor.sub,
      tipo: NotificationEventType.NOVO_ALUNO,
      titulo,
      corpo,
      dadosContexto: { studentId: student.id },
    });

    return toStudentResponseDto(student);
  }

  async list(
    query: ListStudentsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListStudentsResponseDto> {
    const scope = this.scopeForActor(actor);
    const result = await this.studentRepository.list({
      ...scope,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: result.items.map(toStudentResponseDto),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<StudentResponseDto> {
    const student = await this.fetchOrThrow(id, actor);
    return toStudentResponseDto(student);
  }

  /**
   * Leitura bruta (sem escopo/DTO), para consumo por OUTROS módulos que
   * já validaram o acesso por outro caminho (ex. `RoutesService`/
   * `TripsService` resolvendo o nome do aluno para o Message
   * Personalization AI, depois de já ter validado o `Contract` do
   * aluno). Mesmo padrão de `VehiclesService.countActive` — nunca expõe
   * o repositório em si para fora do módulo.
   */
  async findRawById(id: string): Promise<Student | null> {
    return this.studentRepository.findById(id);
  }

  async update(
    id: string,
    dto: UpdateStudentDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<StudentResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    this.assertOwnedByActor(existing, actor);

    const updated = await this.studentRepository.update(id, {
      ...dto,
      dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
    });

    await this.recordAudit({
      entidadeId: id,
      acao: "UPDATED",
      atorUserId: actor.sub,
      dadosAntes: { nome: existing.nome },
      dadosDepois: { nome: updated.nome },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toStudentResponseDto(updated);
  }

  async remove(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    const existing = await this.fetchOrThrow(id, actor);
    this.assertOwnedByActor(existing, actor);

    await this.studentRepository.update(id, { deletedAt: new Date() });

    await this.recordAudit({
      entidadeId: id,
      acao: "DELETED",
      atorUserId: actor.sub,
      dadosAntes: { nome: existing.nome },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<StudentResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    this.assertOwnedByActor(existing, actor);

    if (!file.mimetype.startsWith("image/")) {
      throw new ForbiddenException("O arquivo enviado precisa ser uma imagem.");
    }

    const extension = file.originalname.split(".").pop() ?? "png";
    const url = await this.storageService.upload(
      `students/${id}/foto.${extension}`,
      file.buffer,
      file.mimetype,
    );
    const updated = await this.studentRepository.update(id, { fotoUrl: url });

    await this.recordAudit({
      entidadeId: id,
      acao: "PHOTO_UPLOADED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toStudentResponseDto(updated);
  }

  async listAuditLogs(
    id: string,
    actor: AuthenticatedUser,
    page = 1,
    pageSize = 20,
  ): Promise<ListAuditLogsResponseDto> {
    await this.fetchOrThrow(id, actor);
    const result = await this.auditLogService.listByEntity(ENTIDADE_TIPO, id, page, pageSize);
    return {
      items: result.items.map((log) => ({
        id: log.id,
        entidadeTipo: log.entidadeTipo,
        entidadeId: log.entidadeId,
        acao: log.acao,
        atorUserId: log.atorUserId,
        dadosAntes: log.dadosAntes,
        dadosDepois: log.dadosDepois,
        createdAt: log.createdAt,
      })),
      total: result.total,
      page,
      pageSize,
    };
  }

  // ---------------------------------------------------------------------
  // Pessoas autorizadas (briefing "CADASTRO DO ALUNO")
  // ---------------------------------------------------------------------

  async createAuthorizedPerson(
    studentId: string,
    dto: CreateStudentAuthorizedPersonDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<StudentAuthorizedPersonResponseDto> {
    const student = await this.fetchOrThrow(studentId, actor);
    this.assertOwnedByActor(student, actor);

    const person = await this.authorizedPersonRepository.create({ ...dto, studentId });

    await this.recordAudit({
      entidadeId: studentId,
      acao: "AUTHORIZED_PERSON_ADDED",
      atorUserId: actor.sub,
      dadosDepois: { nome: person.nome },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toStudentAuthorizedPersonResponseDto(person);
  }

  async listAuthorizedPersons(
    studentId: string,
    actor: AuthenticatedUser,
  ): Promise<StudentAuthorizedPersonResponseDto[]> {
    await this.fetchOrThrow(studentId, actor);
    const persons = await this.authorizedPersonRepository.listByStudent(studentId);
    return persons.map(toStudentAuthorizedPersonResponseDto);
  }

  async removeAuthorizedPerson(
    studentId: string,
    personId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<void> {
    const student = await this.fetchOrThrow(studentId, actor);
    this.assertOwnedByActor(student, actor);

    const person = await this.authorizedPersonRepository.findById(personId);
    if (!person || person.studentId !== studentId) {
      throw new NotFoundException("Pessoa autorizada não encontrada.");
    }

    await this.authorizedPersonRepository.remove(personId);

    await this.recordAudit({
      entidadeId: studentId,
      acao: "AUTHORIZED_PERSON_REMOVED",
      atorUserId: actor.sub,
      dadosAntes: { nome: person.nome },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }
}
