import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationEventType, type Student } from "@prisma/client";

import { STUDENT_CREDENTIALED_EVENT } from "./events/student-credentialed.event";
import { toStudentAddressOverrideResponseDto } from "./mappers/student-address-override.mapper";
import { toStudentAuthorizedPersonResponseDto } from "./mappers/student-authorized-person.mapper";
import { toStudentResponseDto } from "./mappers/student.mapper";
import {
  STUDENT_ADDRESS_OVERRIDE_REPOSITORY,
  STUDENT_AUTHORIZED_PERSON_REPOSITORY,
  STUDENT_REPOSITORY,
} from "./students.constants";

import type { CreateStudentAddressOverrideDto } from "./dto/create-student-address-override.dto";
import type { CreateStudentAuthorizedPersonDto } from "./dto/create-student-authorized-person.dto";
import type { CreateStudentDto } from "./dto/create-student.dto";
import type { ListStudentsQueryDto } from "./dto/list-students-query.dto";
import type { StudentAddressOverrideResponseDto } from "./dto/student-address-override-response.dto";
import type { StudentAuthorizedPersonResponseDto } from "./dto/student-authorized-person-response.dto";
import type { ListStudentsResponseDto, StudentResponseDto } from "./dto/student-response.dto";
import type { UpdateStudentDto } from "./dto/update-student.dto";
import type { StudentAddressOverrideRepository } from "./repositories/student-address-override.repository";
import type { StudentAuthorizedPersonRepository } from "./repositories/student-authorized-person.repository";
import type { StudentAccessScope, StudentRepository } from "./repositories/student.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { ListAuditLogsResponseDto } from "@/common/dto/audit-log-response.dto";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { StudentPreRegistrationRepository } from "@/modules/student-pre-registrations/repositories/student-pre-registration.repository";

import { PrismaService } from "@/infra/database/prisma.service";
import { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { SCHOOL_REPOSITORY } from "@/modules/schools/schools.constants";
import { STUDENT_PRE_REGISTRATION_REPOSITORY } from "@/modules/student-pre-registrations/student-pre-registrations.constants";
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
    @Inject(SCHOOL_REPOSITORY) private readonly schoolRepository: SchoolRepository,
    @Inject(STUDENT_PRE_REGISTRATION_REPOSITORY)
    private readonly preRegistrationRepository: StudentPreRegistrationRepository,
    @Inject(STUDENT_ADDRESS_OVERRIDE_REPOSITORY)
    private readonly addressOverrideRepository: StudentAddressOverrideRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Achado desta auditoria: `create`/`update` aceitavam qualquer
   * `schoolId` (inclusive inexistente) e o `create`/`update` do Prisma
   * estourava a FK no Postgres, virando um 500 cru em vez de um erro
   * claro pro cliente. Só chama quando `schoolId` está presente no DTO
   * (em `update`, o campo é opcional — `undefined` significa "não mexer").
   */
  private async assertSchoolExists(schoolId: string): Promise<void> {
    const school = await this.schoolRepository.findById(schoolId);
    if (!school) {
      throw new BadRequestException("Escola informada não existe.");
    }
  }

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
    await this.assertSchoolExists(dto.schoolId);

    const { preRegistrationId, ...studentInput } = dto;
    // Validado ANTES de criar o `Student` (nunca depois) — pedido do
    // usuário: fluxo "código do transporte + celular", caminho
    // "Continuar". Só o próprio Responsável que reivindicou
    // (`POST /student-pre-registrations/:id/claim`) pode terminar o
    // cadastro com este `preRegistrationId`, e só uma vez (status
    // `RECLAMADO`) — nunca aceito de qualquer id passado pelo cliente.
    if (preRegistrationId) {
      const preRegistration =
        await this.preRegistrationRepository.findByIdWithCompany(preRegistrationId);
      if (
        !preRegistration ||
        preRegistration.status !== "RECLAMADO" ||
        preRegistration.reclamadoPorId !== actor.sub
      ) {
        throw new BadRequestException("Pré-cadastro inválido ou não reivindicado por você.");
      }
    }

    const student = await this.studentRepository.create({
      ...studentInput,
      responsavelId: actor.sub,
      dataNascimento: new Date(dto.dataNascimento),
    });

    if (preRegistrationId) {
      try {
        await this.preRegistrationRepository.markConcluded(preRegistrationId, student.id);
      } catch (error) {
        // Best-effort (mesmo espírito de `recordAudit`) — o `Student` já
        // existe e é o que importa; o pré-cadastro só fica "esquecido"
        // como `RECLAMADO` em vez de `CONCLUIDO`, nunca bloqueia o
        // Responsável.
        this.logger.warn(
          `Falha ao concluir pré-cadastro ${preRegistrationId} (Student ${student.id})`,
        );
        this.logger.warn(error instanceof Error ? error.message : String(error));
      }

      // "De fato credenciar aquele motorista" (pedido do usuário) — sem
      // isto, o fluxo "código do transporte + celular" criava o Student
      // e parava aí, nunca gerando a `TransportRequest`/`Contract` que o
      // resto da plataforma (Rotas, Trips, GPS ao vivo) exige pra
      // existir. `companyId` vem do próprio pré-cadastro (a
      // transportadora que o criou), não de `dto` — nunca aceito de
      // qualquer valor que o cliente mande.
      const preRegistration =
        await this.preRegistrationRepository.findByIdWithCompany(preRegistrationId);
      if (preRegistration) {
        this.eventEmitter.emit(STUDENT_CREDENTIALED_EVENT, {
          studentId: student.id,
          responsavelId: actor.sub,
          companyId: preRegistration.companyId,
          schoolId: student.schoolId,
          turno: student.turno,
        });
      }
    }

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

    return toStudentResponseDto(student, await this.resolvePrivateFotoUrl(student));
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
      items: await Promise.all(
        result.items.map(async (student) =>
          toStudentResponseDto(student, await this.resolvePrivateFotoUrl(student)),
        ),
      ),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<StudentResponseDto> {
    const student = await this.fetchOrThrow(id, actor);
    return toStudentResponseDto(student, await this.resolvePrivateFotoUrl(student));
  }

  /** Ver nota em `toStudentResponseDto` (Dossiê 45, achado C3). */
  private async resolvePrivateFotoUrl(student: {
    fotoUrl: string | null;
    fotoPath: string | null;
  }): Promise<string | null> {
    if (!student.fotoPath) return student.fotoUrl;
    return this.storageService.getSignedUrl(student.fotoPath);
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

    if (dto.schoolId) {
      await this.assertSchoolExists(dto.schoolId);
    }

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

    return toStudentResponseDto(updated, await this.resolvePrivateFotoUrl(updated));
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
    // uploadPrivate (Dossiê 32): foto de aluno é dado pessoal de criança/
    // adolescente (LGPD art. 14) — nunca exposta por URL pública
    // previsível (`students/{id}/foto.png` seria adivinhável só com o id).
    // `fotoPath` é o que persiste (Dossiê 45, achado C3) — releituras
    // assinam uma URL nova de curta validade em vez de reusar `url`.
    const { path, url } = await this.storageService.uploadPrivate(
      `students/${id}/foto.${extension}`,
      file.buffer,
      file.mimetype,
    );
    const updated = await this.studentRepository.update(id, { fotoUrl: url, fotoPath: path });

    await this.recordAudit({
      entidadeId: id,
      acao: "PHOTO_UPLOADED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toStudentResponseDto(updated, url);
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

  // ---------------------------------------------------------------------
  // Desvio de endereço por dia (pedido do usuário: "o responsável pode
  // informar se algum dia ele irá para outro endereço — na ida, na
  // volta ou ambos... isso pode ser feito até antes da van iniciar o
  // novo serviço")
  // ---------------------------------------------------------------------

  /** "2026-09-01" → meia-noite UTC daquele dia — mesma convenção de `StudentAddressOverride.data` (`@db.Date`) e do `today()` de `TripsService`. */
  private parseDataOnly(data: string): Date {
    return new Date(`${data}T00:00:00.000Z`);
  }

  /**
   * Bloqueia criar/editar/remover o desvio quando a viagem do dia já
   * começou (pedido do usuário: "isso pode ser feito até antes da van
   * iniciar o novo serviço"). Consulta `RouteStudent`/`Trip` direto via
   * `PrismaService` (`withBypass`) — nunca via `RoutesService`/
   * `TripsService` (ciclo real de módulo, ver nota em
   * `students.module.ts`). Aluno sem nenhuma rota ativa (ainda não
   * credenciado por nenhum transportador) nunca é bloqueado: não há
   * viagem possível pra travar.
   */
  private async assertDiaAindaNaoIniciado(studentId: string, dia: Date): Promise<void> {
    const vinculos = await this.prisma.withBypass(
      this.prisma.routeStudent.findMany({
        where: { studentId, ativo: true },
        select: { routeId: true },
      }),
    );
    if (vinculos.length === 0) return;

    const routeIds = vinculos.map((v) => v.routeId);
    const viagemJaExiste = await this.prisma.withBypass(
      this.prisma.trip.findFirst({ where: { routeId: { in: routeIds }, data: dia } }),
    );
    if (viagemJaExiste) {
      throw new BadRequestException(
        "Não é mais possível alterar o endereço deste dia: a viagem já começou.",
      );
    }
  }

  async upsertAddressOverride(
    studentId: string,
    dto: CreateStudentAddressOverrideDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<StudentAddressOverrideResponseDto> {
    const student = await this.fetchOrThrow(studentId, actor);
    this.assertOwnedByActor(student, actor);

    const dia = this.parseDataOnly(dto.data);
    await this.assertDiaAindaNaoIniciado(studentId, dia);

    const override = await this.addressOverrideRepository.upsert({
      studentId,
      data: dia,
      trecho: dto.trecho,
      cep: dto.cep,
      logradouro: dto.logradouro,
      numero: dto.numero,
      complemento: dto.complemento,
      bairro: dto.bairro,
      cidade: dto.cidade,
      estado: dto.estado,
      latitude: dto.latitude,
      longitude: dto.longitude,
      observacao: dto.observacao,
      criadoPorUserId: actor.sub,
    });

    await this.recordAudit({
      entidadeId: studentId,
      acao: "ADDRESS_OVERRIDE_SET",
      atorUserId: actor.sub,
      dadosDepois: { data: dto.data, trecho: dto.trecho },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toStudentAddressOverrideResponseDto(override);
  }

  /** `from`/`to` opcionais no formato "YYYY-MM-DD" — alimenta o calendário do Responsável (mês visível). */
  async listAddressOverrides(
    studentId: string,
    actor: AuthenticatedUser,
    from?: string,
    to?: string,
  ): Promise<StudentAddressOverrideResponseDto[]> {
    await this.fetchOrThrow(studentId, actor);
    const overrides = await this.addressOverrideRepository.listByStudent(
      studentId,
      from ? this.parseDataOnly(from) : undefined,
      to ? this.parseDataOnly(to) : undefined,
    );
    return overrides.map(toStudentAddressOverrideResponseDto);
  }

  async removeAddressOverride(
    studentId: string,
    overrideId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<void> {
    const student = await this.fetchOrThrow(studentId, actor);
    this.assertOwnedByActor(student, actor);

    const override = await this.addressOverrideRepository.findById(overrideId);
    if (!override || override.studentId !== studentId) {
      throw new NotFoundException("Desvio de endereço não encontrado.");
    }
    await this.assertDiaAindaNaoIniciado(studentId, override.data);

    await this.addressOverrideRepository.remove(overrideId);

    await this.recordAudit({
      entidadeId: studentId,
      acao: "ADDRESS_OVERRIDE_REMOVED",
      atorUserId: actor.sub,
      dadosAntes: { data: override.data.toISOString().slice(0, 10) },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  /**
   * Leitura interna (sem RBAC de ator humano, mesmo padrão de
   * `CompaniesService.getNomeFantasia`) usada por `TripsService` pra
   * saber, ao montar as paradas pendentes de uma viagem, quais alunos
   * têm hoje um endereço diferente do cadastro permanente (pedido do
   * usuário: calendário de endereço alternativo). Mapa por `studentId`
   * — `@@unique([studentId, data])` garante no máximo um desvio por
   * aluno por dia, então nunca há ambiguidade de qual usar.
   */
  async listAddressOverridesByStudentsAndDate(
    studentIds: string[],
    data: Date,
  ): Promise<Map<string, StudentAddressOverrideResponseDto>> {
    if (studentIds.length === 0) return new Map();
    const overrides = await this.prisma.withBypass(
      this.prisma.studentAddressOverride.findMany({
        where: { studentId: { in: studentIds }, data },
      }),
    );
    return new Map(
      overrides.map((override) => [
        override.studentId,
        toStudentAddressOverrideResponseDto(override),
      ]),
    );
  }
}
