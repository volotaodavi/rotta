import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";

/**
 * E2E do módulo Escolas (briefing "Gestão de Escolas") — mesma
 * disciplina de `vehicles.e2e-spec.ts`, aplicação Nest completa contra
 * o Postgres de teste real. O diferencial central testado aqui (nunca
 * presente em Vehicles): DUAS empresas diferentes podem vincular a
 * MESMA escola (catálogo compartilhado, sem RLS em `schools`).
 */
describe("Schools (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  const adminUserId = randomUUID();

  const validSchoolPayload = (overrides: Record<string, unknown> = {}) => ({
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
    ...overrides,
  });

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

    adminToken = signTestToken({
      sub: adminUserId,
      tenantId: null,
      role: Role.ADMIN_ROTTA,
      vinculoId: randomUUID(),
    });
  });

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.schoolCompanyLink.deleteMany();
    await prisma.schoolAccessPoint.deleteMany();
    await prisma.school.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.schoolCompanyLink.deleteMany();
    await prisma.schoolAccessPoint.deleteMany();
    await prisma.school.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("POST /v1/schools", () => {
    it("rejeita requisição sem token (401)", async () => {
      await request(app.getHttpServer()).post("/v1/schools").send(validSchoolPayload()).expect(401);
    });

    it("Motorista não pode cadastrar escola (403)", async () => {
      const { motoristaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${motoristaToken}`)
        .send(validSchoolPayload())
        .expect(403);
    });

    it("cria a escola, gera o código interno e vincula automaticamente a empresa (201)", async () => {
      const { empresaToken, companyId } = await createCompanyWithMembers();
      const response = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);

      expect(response.body.data.codigoInterno).toMatch(/^ESC-\d{6}$/);
      expect(response.body.data.status).toBe("ATIVA");

      const links = await request(app.getHttpServer())
        .get(`/v1/schools/${response.body.data.id}/company-links`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(links.body.data.items).toHaveLength(1);
      expect(links.body.data.items[0].companyId).toBe(companyId);
    });

    it("rejeita código INEP duplicado (409)", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload({ codigoInep: "12345678" }))
        .expect(201);

      const second = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${second.empresaToken}`)
        .send(validSchoolPayload({ codigoInep: "12345678", nomeOficial: "Outra Escola" }))
        .expect(409);
    });
  });

  describe("Catálogo compartilhado entre Empresas (diferencial do módulo)", () => {
    it("duas empresas diferentes podem vincular a MESMA escola", async () => {
      const first = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${first.empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);
      const schoolId = createResponse.body.data.id as string;

      const second = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .get(`/v1/schools/${schoolId}`)
        .set("Authorization", `Bearer ${second.empresaToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/v1/schools/${schoolId}/company-links`)
        .set("Authorization", `Bearer ${second.empresaToken}`)
        .send({})
        .expect(201);

      const links = await request(app.getHttpServer())
        .get(`/v1/schools/${schoolId}/company-links`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const companyIds = links.body.data.items.map((l: { companyId: string }) => l.companyId);
      expect(companyIds).toEqual(expect.arrayContaining([first.companyId, second.companyId]));
    });

    it("rejeita vincular a mesma empresa duas vezes (409)", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/v1/schools/${createResponse.body.data.id}/company-links`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({})
        .expect(409);
    });

    it("Motorista só enxerga a escola quando a PRÓPRIA empresa está vinculada (404, nunca os dados de terceiros)", async () => {
      const owner = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${owner.empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);
      const schoolId = createResponse.body.data.id as string;

      const other = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .get(`/v1/schools/${schoolId}`)
        .set("Authorization", `Bearer ${other.motoristaToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/v1/schools/${schoolId}`)
        .set("Authorization", `Bearer ${owner.motoristaToken}`)
        .expect(200);
    });
  });

  describe("Responsável (RBAC de leitura)", () => {
    async function createResponsavelToken() {
      const userId = randomUUID();
      await prisma.user.create({
        data: {
          id: userId,
          nome: "Responsável (teste)",
          email: `responsavel-${userId}@teste.com.br`,
          telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
          cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
          passwordHash: "x",
          isResponsavel: true,
        },
      });
      return signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });
    }

    it("Responsável pode listar e ver detalhes de escolas do catálogo (para escolher a escola do aluno)", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);
      const schoolId = createResponse.body.data.id as string;

      const responsavelToken = await createResponsavelToken();

      const list = await request(app.getHttpServer())
        .get("/v1/schools")
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(200);
      expect(list.body.data.items.some((s: { id: string }) => s.id === schoolId)).toBe(true);

      await request(app.getHttpServer())
        .get(`/v1/schools/${schoolId}`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(200);
    });

    it("Responsável não pode cadastrar escola (403)", async () => {
      const responsavelToken = await createResponsavelToken();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${responsavelToken}`)
        .send(validSchoolPayload())
        .expect(403);
    });
  });

  describe("Portões e Pontos de Embarque", () => {
    it("cadastra um ponto de acesso e o lista de volta", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);
      const schoolId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .post(`/v1/schools/${schoolId}/access-points`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({
          tipo: "PONTO_EMBARQUE",
          nome: "Portão dos Alunos",
          latitude: -23.56,
          longitude: -46.65,
        })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get(`/v1/schools/${schoolId}/access-points`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].nome).toBe("Portão dos Alunos");
    });
  });

  describe("Status e exclusão lógica", () => {
    it("atualiza o status e registra no histórico de auditoria", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);
      const schoolId = createResponse.body.data.id as string;

      const updated = await request(app.getHttpServer())
        .patch(`/v1/schools/${schoolId}/status`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ status: "ARQUIVADA" })
        .expect(200);
      expect(updated.body.data.status).toBe("ARQUIVADA");

      const logs = await request(app.getHttpServer())
        .get(`/v1/schools/${schoolId}/audit-logs`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(logs.body.data.items.some((l: { acao: string }) => l.acao === "STATUS_CHANGED")).toBe(
        true,
      );
    });

    it("soft delete: some das listagens mas o registro é preservado", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);
      const schoolId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .delete(`/v1/schools/${schoolId}`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(204);

      const list = await request(app.getHttpServer())
        .get("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(list.body.data.items).toHaveLength(0);

      const stillExists = await prisma.school.findUnique({ where: { id: schoolId } });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.deletedAt).not.toBeNull();
    });
  });

  describe("Dashboard, busca e exportação", () => {
    it("Admin Rotta sem companyId vê o catálogo inteiro; Empresa só a própria", async () => {
      const first = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${first.empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);

      const dashboardAdmin = await request(app.getHttpServer())
        .get("/v1/schools/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(dashboardAdmin.body.data.totalEscolas).toBeGreaterThanOrEqual(1);

      const dashboardEmpresa = await request(app.getHttpServer())
        .get("/v1/schools/dashboard")
        .set("Authorization", `Bearer ${first.empresaToken}`)
        .expect(200);
      expect(dashboardEmpresa.body.data.totalEscolas).toBe(1);
    });

    it("pesquisa por nome oficial", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload({ nomeOficial: "Escola Localizável Única" }))
        .expect(201);

      const result = await request(app.getHttpServer())
        .get("/v1/schools")
        .query({ search: "Localizável" })
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(result.body.data.items).toHaveLength(1);
    });

    it("exporta a listagem em CSV", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload())
        .expect(201);

      const response = await request(app.getHttpServer())
        .get("/v1/schools/export")
        .query({ format: "csv" })
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(response.text).toContain("Nome Oficial");
      expect(response.text).toContain("EMEF Professora Ana Souza");
    });

    it("detecta possíveis escolas duplicadas por nome + cidade/estado", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/schools")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validSchoolPayload({ nomeOficial: "EMEF Ana Souza" }))
        .expect(201);

      const result = await request(app.getHttpServer())
        .get("/v1/schools/check-duplicates")
        .query({ nomeOficial: "EMEF Professora Ana Souza", cidade: "São Paulo", estado: "SP" })
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(result.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
