import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";


/**
 * E2E do módulo Empresas (Dossiê 16) — sobe a aplicação Nest completa
 * (guards/interceptors/filtros globais reais) contra o Postgres de
 * teste (`rotta_test`, mesmas migrations/RLS do banco de
 * desenvolvimento — Dossiê 8, Seção 15). Cobre exatamente as
 * propriedades mais críticas exigidas pelo briefing: RBAC por papel e
 * isolamento multi-tenant real (nunca simulado/mockado).
 */
describe("Companies (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  const adminUserId = randomUUID();

  const validCompanyPayload = (overrides: Record<string, unknown> = {}) => ({
    razaoSocial: "Transportes Rotta LTDA",
    nomeFantasia: "Rotta Transportes",
    cpfCnpj: "11222333000181",
    tipo: "LTDA",
    email: "contato@rottatransportes.com.br",
    telefone: "11987654321",
    cep: "01310100",
    endereco: "Avenida Paulista",
    numero: "1000",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    administrador: {
      nome: "Ana Souza",
      email: "ana@rottatransportes.com.br",
      telefone: "11912345678",
      cpf: "52998224725",
      senha: "SenhaForte123",
    },
    ...overrides,
  });

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
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("POST /v1/companies", () => {
    it("rejeita requisição sem token (401)", async () => {
      await request(app.getHttpServer())
        .post("/v1/companies")
        .send(validCompanyPayload())
        .expect(401);
    });

    it("cria uma empresa LTDA + usuário administrador + membership (201)", async () => {
      const response = await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload())
        .expect(201);

      expect(response.body.data).toMatchObject({
        nomeFantasia: "Rotta Transportes",
        tipo: "LTDA",
        status: "TRIAL",
        plan: { code: "STARTER" },
      });

      const membership = await prisma.membership.findFirst({
        where: { companyId: response.body.data.id },
      });
      expect(membership?.role).toBe(Role.EMPRESA);
    });

    it("rejeita CNPJ inválido (400)", async () => {
      await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload({ cpfCnpj: "11111111111111" }))
        .expect(400);
    });

    it("rejeita CPF/CNPJ duplicado (409)", async () => {
      await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload({ email: "outro@rottatransportes.com.br" }))
        .expect(409);
    });

    it("motorista autônomo: CPF da empresa deve ser igual ao do administrador (400)", async () => {
      await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          validCompanyPayload({
            tipo: "AUTONOMO",
            cpfCnpj: "52998224725",
            administrador: {
              nome: "João Motorista",
              email: "joao@rotta.com.br",
              telefone: "11911112222",
              cpf: "11144477735",
              senha: "SenhaForte123",
            },
          }),
        )
        .expect(400);
    });

    it("motorista autônomo: CPF igual vira o administrador automaticamente (201)", async () => {
      const response = await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(
          validCompanyPayload({
            tipo: "AUTONOMO",
            cpfCnpj: "52998224725",
            administrador: {
              nome: "João Motorista",
              email: "joao@rotta.com.br",
              telefone: "11911112222",
              cpf: "52998224725",
              senha: "SenhaForte123",
            },
          }),
        )
        .expect(201);

      expect(response.body.data.tipo).toBe("AUTONOMO");
    });
  });

  describe("Isolamento multi-tenant e RBAC", () => {
    it("EMPRESA não pode listar todas as empresas (403)", async () => {
      const empresaToken = signTestToken({
        sub: randomUUID(),
        tenantId: randomUUID(),
        role: Role.EMPRESA,
        vinculoId: randomUUID(),
      });

      await request(app.getHttpServer())
        .get("/v1/companies")
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(403);
    });

    it("um tenant nunca enxerga a empresa de outro tenant (404, nunca os dados)", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload())
        .expect(201);

      const companyId = createResponse.body.data.id as string;

      const otherTenantToken = signTestToken({
        sub: randomUUID(),
        tenantId: randomUUID(),
        role: Role.EMPRESA,
        vinculoId: randomUUID(),
      });

      await request(app.getHttpServer())
        .get(`/v1/companies/${companyId}`)
        .set("Authorization", `Bearer ${otherTenantToken}`)
        .expect(404);
    });

    it("a própria EMPRESA acessa seus dados normalmente (200)", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload())
        .expect(201);

      const companyId = createResponse.body.data.id as string;

      const ownToken = signTestToken({
        sub: randomUUID(),
        tenantId: companyId,
        role: Role.EMPRESA,
        vinculoId: randomUUID(),
      });

      const response = await request(app.getHttpServer())
        .get(`/v1/companies/${companyId}`)
        .set("Authorization", `Bearer ${ownToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(companyId);
    });
  });

  describe("Ciclo de vida (suspender / reativar / plano)", () => {
    it("suspende, reativa e rejeita troca para o mesmo plano", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload())
        .expect(201);
      const companyId = createResponse.body.data.id as string;

      const suspended = await request(app.getHttpServer())
        .post(`/v1/companies/${companyId}/suspend`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ motivo: "Inadimplência" })
        .expect(201);
      expect(suspended.body.data.status).toBe("SUSPENSO");

      const reactivated = await request(app.getHttpServer())
        .post(`/v1/companies/${companyId}/reactivate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(201);
      expect(reactivated.body.data.status).toBe("ATIVO");

      await request(app.getHttpServer())
        .patch(`/v1/companies/${companyId}/plan`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planCode: "STARTER" })
        .expect(400);

      const auditLogs = await request(app.getHttpServer())
        .get(`/v1/companies/${companyId}/audit-logs`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const actions = auditLogs.body.data.items.map((item: { acao: string }) => item.acao);
      expect(actions).toEqual(expect.arrayContaining(["CREATED", "SUSPENDED", "REACTIVATED"]));
    });

    it("soft delete: empresa some das listagens mas o registro é preservado", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload())
        .expect(201);
      const companyId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .delete(`/v1/companies/${companyId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/v1/companies/${companyId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
      const stillExists = await prisma.company.findUnique({ where: { id: companyId } });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.deletedAt).not.toBeNull();
    });
  });

  describe("Configurações da Empresa", () => {
    it("aplica defaults e persiste atualização", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/v1/companies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validCompanyPayload())
        .expect(201);
      const companyId = createResponse.body.data.id as string;

      const defaults = await request(app.getHttpServer())
        .get(`/v1/companies/${companyId}/settings`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(defaults.body.data).toEqual({
        tema: "dark",
        canaisNotificacao: ["push"],
        integracoes: {},
      });

      const updated = await request(app.getHttpServer())
        .patch(`/v1/companies/${companyId}/settings`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ tema: "light" })
        .expect(200);
      expect(updated.body.data.tema).toBe("light");
    });
  });
});
