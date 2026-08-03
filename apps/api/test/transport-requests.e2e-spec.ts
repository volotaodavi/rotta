import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";


const SAO_PAULO = { latitude: -23.561684, longitude: -46.655981 };

/**
 * E2E do fluxo de solicitação de transporte (briefing "Marketplace"
 * §"SOLICITAR TRANSPORTE"/"SOLICITAÇÃO"). `transport_requests` TEM RLS
 * por `companyId` — diferente de `students.e2e-spec.ts`, aqui o próprio
 * endpoint (`TransportRequestsService.create`) é quem grava sob bypass,
 * não o fixture do teste.
 */
describe("Marketplace — solicitação de transporte (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let schoolId: string;
  const adminUserId = randomUUID();
  let planId: string;

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

  async function createCompanyWithEmpresaToken(overrides: Record<string, unknown> = {}) {
    const company = await prisma.company.create({
      data: {
        razaoSocial: "Transporte Escolar Teste LTDA",
        nomeFantasia: "TransEscolar Teste",
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
        tipo: "LTDA",
        email: "contato@transescolar-teste.com.br",
        telefone: "11987654321",
        cep: "01310100",
        endereco: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        latitude: SAO_PAULO.latitude,
        longitude: SAO_PAULO.longitude,
        status: "ATIVO",
        planId,
        ...overrides,
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

    return { companyId: company.id, empresaToken };
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

    const plan = await prisma.plan.findFirst({ where: { code: "STARTER" } });
    if (!plan) {
      throw new Error("Plano STARTER não encontrado — rode `pnpm prisma:seed`.");
    }
    planId = plan.id;

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
    await prisma.student.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
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
    await prisma.student.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("POST /v1/marketplace/transport-requests", () => {
    it("rejeita requisição sem token (401)", async () => {
      await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .send({ companyId: randomUUID(), studentId: randomUUID() })
        .expect(401);
    });

    it("Empresa não pode solicitar transporte (403) — exclusivo do Responsável", async () => {
      const { empresaToken } = await createCompanyWithEmpresaToken();
      await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ companyId: randomUUID(), studentId: randomUUID() })
        .expect(403);
    });

    it("rejeita quando studentId e novoAluno vêm juntos (400)", async () => {
      const { token } = await createResponsavel();
      const { companyId } = await createCompanyWithEmpresaToken();
      await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, studentId: randomUUID(), novoAluno: validStudentPayload() })
        .expect(400);
    });

    it("cria a solicitação usando um aluno já cadastrado (status inicial RECEBIDA)", async () => {
      const { token } = await createResponsavel();
      const { companyId } = await createCompanyWithEmpresaToken();

      const student = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send(validStudentPayload())
        .expect(201);

      const response = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, studentId: student.body.data.id })
        .expect(201);

      expect(response.body.data.status).toBe("RECEBIDA");
      expect(response.body.data.companyId).toBe(companyId);
      expect(response.body.data.studentId).toBe(student.body.data.id);
    });

    it("cria a solicitação com cadastro inline do aluno (novoAluno)", async () => {
      const { token } = await createResponsavel();
      const { companyId } = await createCompanyWithEmpresaToken();

      const response = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, novoAluno: validStudentPayload() })
        .expect(201);

      expect(response.body.data.status).toBe("RECEBIDA");

      const createdStudent = await prisma.student.findUnique({
        where: { id: response.body.data.studentId },
      });
      expect(createdStudent).not.toBeNull();
      expect(createdStudent?.responsavelId).toBeDefined();
    });

    it("rejeita uma segunda solicitação em aberto do mesmo par aluno/empresa (409)", async () => {
      const { token } = await createResponsavel();
      const { companyId } = await createCompanyWithEmpresaToken();

      const student = await request(app.getHttpServer())
        .post("/v1/students")
        .set("Authorization", `Bearer ${token}`)
        .send(validStudentPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, studentId: student.body.data.id })
        .expect(201);

      await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, studentId: student.body.data.id })
        .expect(409);
    });
  });

  describe("Isolamento — Empresa só vê/altera as próprias solicitações", () => {
    it("Empresa não enxerga solicitação de outra empresa (404)", async () => {
      const { token } = await createResponsavel();
      const { companyId } = await createCompanyWithEmpresaToken();
      const { empresaToken: outraEmpresaToken } = await createCompanyWithEmpresaToken({
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
      });

      const created = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, novoAluno: validStudentPayload() })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/v1/marketplace/transport-requests/${created.body.data.id}`)
        .set("Authorization", `Bearer ${outraEmpresaToken}`)
        .expect(404);
    });

    it("Responsável não enxerga solicitação de outro Responsável (404)", async () => {
      const owner = await createResponsavel();
      const stranger = await createResponsavel();
      const { companyId } = await createCompanyWithEmpresaToken();

      const created = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ companyId, novoAluno: validStudentPayload() })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/v1/marketplace/transport-requests/${created.body.data.id}`)
        .set("Authorization", `Bearer ${stranger.token}`)
        .expect(404);
    });
  });

  describe("Fluxo de status — exclusivo da Empresa dona da solicitação", () => {
    it("Responsável não pode aprovar a própria solicitação (403)", async () => {
      const { token } = await createResponsavel();
      const { companyId } = await createCompanyWithEmpresaToken();

      const created = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, novoAluno: validStudentPayload() })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${created.body.data.id}/aprovar`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("Recebida -> Em análise -> Aprovada", async () => {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();

      const created = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, novoAluno: validStudentPayload() })
        .expect(201);
      const id = created.body.data.id as string;

      const emAnalise = await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${id}/em-analise`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(emAnalise.body.data.status).toBe("EM_ANALISE");

      const aprovada = await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${id}/aprovar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(aprovada.body.data.status).toBe("APROVADA");
    });

    it("Recebida -> Recusada, com motivo obrigatório e visível", async () => {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();

      const created = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, novoAluno: validStudentPayload() })
        .expect(201);
      const id = created.body.data.id as string;

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${id}/recusar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({})
        .expect(400);

      const recusada = await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${id}/recusar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ motivoRecusa: "Capacidade máxima atingida para este turno." })
        .expect(200);

      expect(recusada.body.data.status).toBe("RECUSADA");
      expect(recusada.body.data.motivoRecusa).toBe("Capacidade máxima atingida para este turno.");
    });

    it("não permite mudar status de uma solicitação já encerrada (Aprovada/Recusada)", async () => {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();

      const created = await request(app.getHttpServer())
        .post("/v1/marketplace/transport-requests")
        .set("Authorization", `Bearer ${token}`)
        .send({ companyId, novoAluno: validStudentPayload() })
        .expect(201);
      const id = created.body.data.id as string;

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${id}/aprovar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${id}/recusar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ motivoRecusa: "Mudei de ideia." })
        .expect(403);
    });
  });
});
