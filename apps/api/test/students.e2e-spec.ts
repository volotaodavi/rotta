import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";

/**
 * E2E do módulo Alunos (briefing "Marketplace" §"CADASTRO DO ALUNO") —
 * aplicação Nest completa contra o Postgres de teste real. Diferencial
 * central testado: `Student` pertence ao RESPONSÁVEL (nunca a uma
 * Empresa/tenant) — Empresa/Motorista só o enxergam através de um
 * `Contract` ATIVO (criado aqui via fixture direta, já que o módulo
 * Marketplace ainda não expõe o fluxo completo de contratação).
 */
describe("Students (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let schoolId: string;
  const adminUserId = randomUUID();

  const validStudentPayload = (overrides: Record<string, unknown> = {}) => ({
    nome: "Maria Souza",
    dataNascimento: "2015-03-20",
    sexo: "FEMININO",
    schoolId,
    turno: "MANHA",
    embarqueCep: "01310100",
    embarqueLogradouro: "Avenida Paulista",
    embarqueNumero: "1000",
    embarqueBairro: "Bela Vista",
    embarqueCidade: "São Paulo",
    embarqueEstado: "SP",
    desembarqueCep: "01310100",
    desembarqueLogradouro: "Avenida Paulista",
    desembarqueNumero: "1000",
    desembarqueBairro: "Bela Vista",
    desembarqueCidade: "São Paulo",
    desembarqueEstado: "SP",
    ...overrides,
  });

  async function createResponsavel() {
    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        nome: "Beatriz Responsável (teste)",
        email: `beatriz-${userId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
        isResponsavel: true,
      },
    });
    const token = signTestToken({
      sub: userId,
      tenantId: null,
      role: Role.RESPONSAVEL,
      vinculoId: userId,
    });
    return { userId, token };
  }

  async function createCompanyWithMembers() {
    const plan = await prisma.plan.findFirst({ where: { code: "STARTER" } });
    if (!plan) {
      throw new Error("Plano STARTER não encontrado — rode `pnpm prisma:seed`.");
    }

    const company = await prisma.company.create({
      data: {
        codigoInterno: `EMP-TEST-${randomUUID().slice(0, 8)}`,
        razaoSocial: "Transportes Teste LTDA",
        nomeFantasia: "Teste Transportes",
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
        tipo: "LTDA",
        email: "contato@teste-transportes.com.br",
        telefone: "11987654321",
        cep: "01310100",
        endereco: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        planId: plan.id,
      },
    });

    const empresaUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: empresaUserId,
        nome: "Admin Empresa (teste)",
        email: `empresa-${empresaUserId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });
    await prisma.membership.create({
      data: { userId: empresaUserId, companyId: company.id, role: Role.EMPRESA },
    });
    const empresaToken = signTestToken({
      sub: empresaUserId,
      tenantId: company.id,
      role: Role.EMPRESA,
      vinculoId: randomUUID(),
    });

    const motoristaUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: motoristaUserId,
        nome: "Motorista (teste)",
        email: `motorista-${motoristaUserId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });
    await prisma.membership.create({
      data: { userId: motoristaUserId, companyId: company.id, role: Role.MOTORISTA },
    });
    const motoristaToken = signTestToken({
      sub: motoristaUserId,
      tenantId: company.id,
      role: Role.MOTORISTA,
      vinculoId: randomUUID(),
    });

    return { companyId: company.id, empresaToken, motoristaUserId, motoristaToken };
  }

  /** Fixture direta (TransportRequest APROVADA + Contract ATIVO) — o fluxo real de contratação vive no módulo Marketplace. */
  async function createActiveContract(input: {
    studentId: string;
    responsavelId: string;
    companyId: string;
    motoristaId?: string;
  }) {
    const transportRequest = await prisma.transportRequest.create({
      data: {
        studentId: input.studentId,
        responsavelId: input.responsavelId,
        companyId: input.companyId,
        schoolId,
        turno: "MANHA",
        status: "APROVADA",
      },
    });
    return prisma.contract.create({
      data: {
        transportRequestId: transportRequest.id,
        studentId: input.studentId,
        responsavelId: input.responsavelId,
        companyId: input.companyId,
        schoolId,
        motoristaId: input.motoristaId,
        valorMensalidadeCentavos: 35000,
        planoDescricao: "Mensal",
        regras: "Sem regras especiais.",
        vigenciaInicio: new Date(),
        status: "ATIVO",
        ativadoEm: new Date(),
      },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = new PrismaClient();
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.user.upsert({
      where: { id: adminUserId },
      update: {},
      create: {
        id: adminUserId,
        nome: "Admin Rotta (teste)",
        email: `admin-${adminUserId}@rotta.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });

    const school = await prisma.school.create({
      data: {
        codigoInterno: `ESC-TEST-${randomUUID().slice(0, 8)}`,
        nomeOficial: "EMEF Professora Ana Souza",
        dependenciaAdministrativa: "MUNICIPAL",
        cep: "01310100",
        logradouro: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        tipos: ["FUNDAMENTAL"],
        turnosAtendidos: ["MANHA", "TARDE"],
      },
    });
    schoolId = school.id;
  });

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.rating.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.transportRequest.deleteMany();
    await prisma.studentAuthorizedPerson.deleteMany();
    await prisma.student.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.withdrawalRequest.deleteMany();
    await prisma.company.deleteMany();
    await prisma.school.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.rating.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.transportRequest.deleteMany();
    await prisma.studentAuthorizedPerson.deleteMany();
    await prisma.student.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.withdrawalRequest.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("POST /v1/students", () => {
    it("rejeita requisição sem token (401)", async () => {
      await request(app.getHttpServer())
        .post("/v1/students")
        .send(validStudentPayload())
        .expect(401);
    });

    it("Empresa não pode cadastrar aluno (403) — exclusivo do Responsável", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validStudentPayload())
        .expect(403);
    });

    it("Responsável cria o aluno, sempre como dono (responsavelId = actor.sub)", async () => {
      const { token } = await createResponsavel();
      const response = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send(validStudentPayload())
        .expect(201);

      expect(response.body.data.nome).toBe("Maria Souza");
      expect(response.body.data.schoolId).toBe(schoolId);
    });
  });

  describe("Isolamento entre Responsáveis (LGPD — cada um só vê os próprios alunos)", () => {
    it("um Responsável nunca enxerga o aluno de outro (404, nunca os dados de terceiros)", async () => {
      const first = await createResponsavel();
      const second = await createResponsavel();

      const created = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${first.token}`)
        .send(validStudentPayload())
        .expect(201);

      await request(app.getHttpServer())
        .get(`/v1/students/${created.body.data.id}`)
        .set("Authorization", `Bearer ${second.token}`)
        .expect(404);

      const secondList = await request(app.getHttpServer())
        .get("/v1/students")
        .set("Authorization", `Bearer ${second.token}`)
        .expect(200);
      expect(secondList.body.data.items).toHaveLength(0);
    });

    it("rejeita update/remoção do aluno de outro Responsável (403 no service, mas 404 na busca prévia)", async () => {
      const owner = await createResponsavel();
      const stranger = await createResponsavel();

      const created = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${owner.token}`)
        .send(validStudentPayload())
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/v1/students/${created.body.data.id}`)
        .set("Authorization", `Bearer ${stranger.token}`)
        .send({ nome: "Nome Trocado" })
        .expect(404);
    });
  });

  describe("Empresa/Motorista só enxergam alunos com Contract ATIVO", () => {
    it("Empresa sem contrato ativo não enxerga o aluno (404)", async () => {
      const { token } = await createResponsavel();
      const { empresaToken } = await createCompanyWithMembers();

      const created = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send(validStudentPayload())
        .expect(201);

      await request(app.getHttpServer())
        .get(`/v1/students/${created.body.data.id}`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(404);
    });

    it("Empresa com Contract ATIVO enxerga o aluno; Motorista designado também", async () => {
      const responsavel = await createResponsavel();
      const { companyId, empresaToken, motoristaUserId, motoristaToken } =
        await createCompanyWithMembers();

      const created = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${responsavel.token}`)
        .send(validStudentPayload())
        .expect(201);
      const studentId = created.body.data.id as string;

      await createActiveContract({
        studentId,
        responsavelId: responsavel.userId,
        companyId,
        motoristaId: motoristaUserId,
      });

      await request(app.getHttpServer())
        .get(`/v1/students/${studentId}`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/v1/students/${studentId}`)
        .set("Authorization", `Bearer ${motoristaToken}`)
        .expect(200);
    });
  });

  describe("Pessoas autorizadas e auditoria", () => {
    it("cadastra pessoa autorizada e a lista de volta", async () => {
      const { token } = await createResponsavel();
      const created = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send(validStudentPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/v1/students/${created.body.data.id}/authorized-persons`)
        .set("Authorization", `Bearer ${token}`)
        .send({ nome: "Ana Souza", parentesco: "Avó" })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get(`/v1/students/${created.body.data.id}/authorized-persons`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
    });

    it("exclusão lógica: some da listagem mas o registro é preservado com trilha de auditoria", async () => {
      const { token } = await createResponsavel();
      const created = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send(validStudentPayload())
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/v1/students/${created.body.data.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const list = await request(app.getHttpServer())
        .get("/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(list.body.data.items).toHaveLength(0);

      const preserved = await prisma.student.findUnique({
        where: { id: created.body.data.id },
      });
      expect(preserved).not.toBeNull();
      expect(preserved?.deletedAt).not.toBeNull();

      // `/audit-logs` passa por `fetchOrThrow` (mesma proteção de RBAC
      // das demais rotas), que exclui registros com `deletedAt` — igual
      // ao restante da API, não há uma rota para consultar auditoria de
      // um recurso já excluído logicamente; a trilha em si é verificada
      // direto no banco (nunca apagada, mesma garantia de `AuditLog`).
      const auditLogs = await prisma.auditLog.findMany({
        where: { entidadeTipo: "Student", entidadeId: created.body.data.id },
      });
      const acoes = auditLogs.map((log) => log.acao);
      expect(acoes).toEqual(expect.arrayContaining(["CREATED", "DELETED"]));
    });
  });
});
