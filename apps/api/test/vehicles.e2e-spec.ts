import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";

/**
 * E2E do módulo Veículos (briefing "Gestão de Veículos") — mesma
 * disciplina de `companies.e2e-spec.ts`: aplicação Nest completa contra
 * o Postgres de teste real (RLS/guards/interceptors reais, nunca
 * mockados). Upload de documentos/foto NÃO é exercitado aqui (mesma
 * lacuna já aceita em `companies.e2e-spec.ts`: o Supabase Storage não
 * está configurado no ambiente de teste) — a lógica de upload já está
 * coberta por `vehicles.service.spec.ts` com `storageService` mockado.
 */
describe("Vehicles (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  const adminUserId = randomUUID();

  const validVehiclePayload = (overrides: Record<string, unknown> = {}) => ({
    placa: "ABC1D23",
    modelo: "Sprinter 415",
    marca: "Mercedes-Benz",
    ano: 2022,
    cor: "Branco",
    capacidadePassageiros: 16,
    tipo: "VAN",
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
    await prisma.vehicleChecklist.deleteMany();
    await prisma.vehicleOccurrence.deleteMany();
    await prisma.vehicleAssignment.deleteMany();
    await prisma.vehicleReminder.deleteMany();
    await prisma.vehicleDocument.deleteMany();
    await prisma.vehicleMaintenance.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.vehicleChecklist.deleteMany();
    await prisma.vehicleOccurrence.deleteMany();
    await prisma.vehicleAssignment.deleteMany();
    await prisma.vehicleReminder.deleteMany();
    await prisma.vehicleDocument.deleteMany();
    await prisma.vehicleMaintenance.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("POST /v1/vehicles", () => {
    it("rejeita requisição sem token (401)", async () => {
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .send(validVehiclePayload())
        .expect(401);
    });

    it("Admin Rotta não pode cadastrar veículo (403 — não tem tenant próprio)", async () => {
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validVehiclePayload())
        .expect(403);
    });

    it("cria o veículo no tenant da EMPRESA autenticada (201)", async () => {
      const { empresaToken, companyId } = await createCompanyWithMembers();

      const response = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);

      expect(response.body.data).toMatchObject({
        placa: "ABC1D23",
        companyId,
        status: "DISPONIVEL",
      });
    });

    it("rejeita capacidade fora da faixa esperada para o tipo (400)", async () => {
      const { empresaToken } = await createCompanyWithMembers();

      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload({ tipo: "SEDAN", capacidadePassageiros: 40 }))
        .expect(400);
    });

    it("rejeita placa inválida (400)", async () => {
      const { empresaToken } = await createCompanyWithMembers();

      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload({ placa: "12345" }))
        .expect(400);
    });

    it("rejeita placa duplicada, mesmo entre tenants diferentes (409)", async () => {
      const first = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${first.empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);

      const second = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${second.empresaToken}`)
        .send(validVehiclePayload())
        .expect(409);
    });
  });

  describe("Isolamento multi-tenant e RBAC", () => {
    it("um tenant nunca enxerga o veículo de outro tenant (404, nunca os dados)", async () => {
      const owner = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${owner.empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      const other = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .get(`/v1/vehicles/${vehicleId}`)
        .set("Authorization", `Bearer ${other.empresaToken}`)
        .expect(404);
    });

    it("Admin Rotta acessa o veículo de qualquer tenant (200)", async () => {
      const owner = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${owner.empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .get(`/v1/vehicles/${vehicleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("Motorista não pode listar/pesquisar veículos (403)", async () => {
      const { motoristaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .get("/v1/vehicles")
        .set("Authorization", `Bearer ${motoristaToken}`)
        .expect(403);
    });

    it("Admin Rotta filtra a listagem cross-tenant por companyId", async () => {
      const first = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${first.empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);

      const second = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${second.empresaToken}`)
        .send(validVehiclePayload({ placa: "XYZ9K87" }))
        .expect(201);

      const filtered = await request(app.getHttpServer())
        .get("/v1/vehicles")
        .query({ companyId: first.companyId })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(filtered.body.data.total).toBe(1);
      expect(filtered.body.data.items).toHaveLength(1);
      expect(filtered.body.data.items[0].companyId).toBe(first.companyId);
    });
  });

  describe("Status e localização", () => {
    it("atualiza o status e registra no histórico de auditoria", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      const updated = await request(app.getHttpServer())
        .patch(`/v1/vehicles/${vehicleId}/status`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ status: "MANUTENCAO" })
        .expect(200);
      expect(updated.body.data.status).toBe("MANUTENCAO");

      const auditLogs = await request(app.getHttpServer())
        .get(`/v1/vehicles/${vehicleId}/audit-logs`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      const actions = auditLogs.body.data.items.map((item: { acao: string }) => item.acao);
      expect(actions).toEqual(expect.arrayContaining(["CREATED", "STATUS_CHANGED"]));
    });
  });

  describe("Vinculação de Motorista + Meu Veículo", () => {
    it("vincula um motorista e ele passa a ver o veículo em /vehicles/me", async () => {
      const { empresaToken, motoristaUserId, motoristaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .get("/v1/vehicles/me")
        .set("Authorization", `Bearer ${motoristaToken}`)
        .expect(200, { data: null });

      await request(app.getHttpServer())
        .post(`/v1/vehicles/${vehicleId}/assignments`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ papel: "MOTORISTA", userId: motoristaUserId })
        .expect(201);

      const myVehicle = await request(app.getHttpServer())
        .get("/v1/vehicles/me")
        .set("Authorization", `Bearer ${motoristaToken}`)
        .expect(200);
      expect(myVehicle.body.data.id).toBe(vehicleId);

      await request(app.getHttpServer())
        .get(`/v1/vehicles/${vehicleId}`)
        .set("Authorization", `Bearer ${motoristaToken}`)
        .expect(200);
    });

    it("rejeita vincular um usuário sem Membership de Motorista ativo (400)", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .post(`/v1/vehicles/${vehicleId}/assignments`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ papel: "MOTORISTA", userId: randomUUID() })
        .expect(400);
    });
  });

  describe("Manutenção e Lembretes", () => {
    it("registra manutenção e atualiza a quilometragem do veículo", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .post(`/v1/vehicles/${vehicleId}/maintenances`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ tipo: "TROCA_OLEO", data: "2026-08-01", quilometragem: 5000 })
        .expect(201);

      const vehicle = await request(app.getHttpServer())
        .get(`/v1/vehicles/${vehicleId}`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(vehicle.body.data.quilometragemAtual).toBe(5000);
    });

    it("cria um lembrete e permite concluí-lo", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      const reminder = await request(app.getHttpServer())
        .post(`/v1/vehicles/${vehicleId}/reminders`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ tipo: "REVISAO", dataAlvo: "2026-12-01" })
        .expect(201);
      expect(reminder.body.data.status).toBe("PENDENTE");

      const concluded = await request(app.getHttpServer())
        .patch(`/v1/vehicles/${vehicleId}/reminders/${reminder.body.data.id}`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ status: "CONCLUIDO" })
        .expect(200);
      expect(concluded.body.data.status).toBe("CONCLUIDO");
    });
  });

  describe("Checklist do motorista", () => {
    it("permite ao motorista vinculado registrar um checklist, sempre em seu próprio nome", async () => {
      const { empresaToken, motoristaUserId, motoristaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .post(`/v1/vehicles/${vehicleId}/assignments`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ papel: "MOTORISTA", userId: motoristaUserId })
        .expect(201);

      const checklist = await request(app.getHttpServer())
        .post(`/v1/vehicles/${vehicleId}/checklists`)
        .set("Authorization", `Bearer ${motoristaToken}`)
        .send({
          pneusOk: true,
          lucesOk: false,
          combustivelOk: true,
          limpezaOk: true,
          equipamentosObrigatoriosOk: true,
          observacoes: "Farol dianteiro esquerdo queimado.",
        })
        .expect(201);

      expect(checklist.body.data.motoristaId).toBe(motoristaUserId);
      expect(checklist.body.data.lucesOk).toBe(false);
    });

    it("EMPRESA não pode criar checklist (apenas o Motorista pode)", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .post(`/v1/vehicles/${vehicleId}/checklists`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({
          pneusOk: true,
          lucesOk: true,
          combustivelOk: true,
          limpezaOk: true,
          equipamentosObrigatoriosOk: true,
        })
        .expect(403);
    });
  });

  describe("Dashboard e exportação", () => {
    it("agrega contadores do dashboard", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);

      const dashboard = await request(app.getHttpServer())
        .get("/v1/vehicles/dashboard")
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      expect(dashboard.body.data).toMatchObject({
        totalVeiculos: 1,
        veiculosAtivos: 1,
        capacidadeTotalPassageiros: 16,
      });
    });

    it("exporta a listagem em CSV", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);

      const response = await request(app.getHttpServer())
        .get("/v1/vehicles/export?format=csv")
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.text).toContain("ABC1D23");
    });

    it("pesquisa por placa", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);

      const response = await request(app.getHttpServer())
        .get("/v1/vehicles?search=ABC1D23")
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.items[0].placa).toBe("ABC1D23");
    });
  });

  describe("Soft delete", () => {
    it("some das listagens mas o registro é preservado (histórico nunca é apagado)", async () => {
      const { empresaToken } = await createCompanyWithMembers();
      const createResponse = await request(app.getHttpServer())
        .post("/v1/vehicles")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validVehiclePayload())
        .expect(201);
      const vehicleId = createResponse.body.data.id as string;

      await request(app.getHttpServer())
        .delete(`/v1/vehicles/${vehicleId}`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/v1/vehicles/${vehicleId}`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(404);

      await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
      const stillExists = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.deletedAt).not.toBeNull();
    });
  });
});
