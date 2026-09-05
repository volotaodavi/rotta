import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";

const THIRTY_ONE_DAYS_AGO = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

/**
 * E2E de avaliações pós-transporte (briefing "Marketplace"
 * §"AVALIAÇÕES") — liberadas somente 30 dias após a ativação do
 * contrato. Como o fluxo real (solicitação -> aprovação -> contrato ->
 * assinatura dos dois lados) só produz `ativadoEm = now()`, os
 * cenários "com 30 dias" ajustam `ativadoEm` direto no banco depois de
 * ativado pelo fluxo real — não há atalho de fixture para "pular" a
 * ativação em si (ela precisa ser genuína, com as duas assinaturas).
 */
describe("Marketplace — avaliações (e2e)", () => {
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

  async function createCompanyWithEmpresaToken() {
    const company = await prisma.company.create({
      data: {
        codigoInterno: `EMP-TEST-${randomUUID().slice(0, 8)}`,
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
        latitude: -23.561684,
        longitude: -46.655981,
        status: "ATIVO",
        planId,
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

  const validContractPayload = () => ({
    valorMensalidadeCentavos: 35000,
    planoDescricao: "Mensal — ida e volta",
    regras: "Cancelamento com 30 dias de antecedência.",
    vigenciaInicio: "2026-02-01",
  });

  /** Fluxo real completo até `Contract.status = ATIVO`, com motorista/monitor/veículo atribuídos. */
  async function createActiveContract() {
    const responsavel = await createResponsavel();
    const { companyId, empresaToken } = await createCompanyWithEmpresaToken();

    const vehicle = await prisma.vehicle.create({
      data: {
        companyId,
        placa: `TST${Math.floor(1000 + Math.random() * 8999)}`,
        modelo: "Sprinter",
        capacidadePassageiros: 20,
        tipo: "VAN",
        status: "DISPONIVEL",
      },
    });
    const motoristaId = randomUUID();
    await prisma.user.create({
      data: {
        id: motoristaId,
        nome: "Motorista (teste)",
        email: `motorista-${motoristaId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });
    const monitorId = randomUUID();
    await prisma.user.create({
      data: {
        id: monitorId,
        nome: "Monitor (teste)",
        email: `monitor-${monitorId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });

    const transportRequestCreated = await request(app.getHttpServer())
      .post("/v1/marketplace/transport-requests")
      .set("Authorization", `Bearer ${responsavel.token}`)
      .send({ companyId, novoAluno: validStudentPayload() })
      .expect(201);
    const requestId = transportRequestCreated.body.data.id as string;

    await request(app.getHttpServer())
      .patch(`/v1/marketplace/transport-requests/${requestId}/aprovar`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .expect(200);

    const contractCreated = await request(app.getHttpServer())
      .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .send({ ...validContractPayload(), vehicleId: vehicle.id, motoristaId, monitorId })
      .expect(201);
    const contractId = contractCreated.body.data.id as string;

    await request(app.getHttpServer())
      .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
      .set("Authorization", `Bearer ${responsavel.token}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/v1/marketplace/contracts/${contractId}/assinar-empresa`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .expect(200);

    return { contractId, responsavelToken: responsavel.token, empresaToken, companyId };
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
    await prisma.vehicle.deleteMany();
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
    await prisma.student.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.withdrawalRequest.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("POST /v1/marketplace/contracts/:id/ratings", () => {
    it("rejeita quando ainda não passaram 30 dias da ativação (403)", async () => {
      const { contractId, responsavelToken } = await createActiveContract();

      await request(app.getHttpServer())
        .post(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .send({ alvoTipo: "EMPRESA", nota: 5 })
        .expect(403);
    });

    it("Empresa não pode avaliar (403) — exclusivo do Responsável", async () => {
      const { contractId, empresaToken } = await createActiveContract();
      await prisma.contract.update({
        where: { id: contractId },
        data: { ativadoEm: THIRTY_ONE_DAYS_AGO },
      });

      await request(app.getHttpServer())
        .post(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ alvoTipo: "EMPRESA", nota: 5 })
        .expect(403);
    });

    it("avalia empresa/motorista/monitor/veículo após 30 dias; rejeita nota duplicada para o mesmo alvo", async () => {
      const { contractId, responsavelToken } = await createActiveContract();
      await prisma.contract.update({
        where: { id: contractId },
        data: { ativadoEm: THIRTY_ONE_DAYS_AGO },
      });

      for (const alvoTipo of ["EMPRESA", "MOTORISTA", "MONITOR", "VEICULO"]) {
        const response = await request(app.getHttpServer())
          .post(`/v1/marketplace/contracts/${contractId}/ratings`)
          .set("Authorization", `Bearer ${responsavelToken}`)
          .send({ alvoTipo, nota: 5, comentario: `Ótimo ${alvoTipo}!` })
          .expect(201);
        expect(response.body.data.alvoTipo).toBe(alvoTipo);
        expect(response.body.data.alvoId).toBeTruthy();
      }

      await request(app.getHttpServer())
        .post(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .send({ alvoTipo: "EMPRESA", nota: 3 })
        .expect(409);
    });

    it("rejeita nota fora do intervalo 1-5", async () => {
      const { contractId, responsavelToken } = await createActiveContract();
      await prisma.contract.update({
        where: { id: contractId },
        data: { ativadoEm: THIRTY_ONE_DAYS_AGO },
      });

      await request(app.getHttpServer())
        .post(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .send({ alvoTipo: "EMPRESA", nota: 6 })
        .expect(400);
    });
  });

  describe("GET /v1/marketplace/contracts/:id/ratings", () => {
    it("Empresa enxerga as avaliações recebidas no próprio contrato", async () => {
      const { contractId, responsavelToken, empresaToken } = await createActiveContract();
      await prisma.contract.update({
        where: { id: contractId },
        data: { ativadoEm: THIRTY_ONE_DAYS_AGO },
      });
      await request(app.getHttpServer())
        .post(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .send({ alvoTipo: "EMPRESA", nota: 5 })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].alvoTipo).toBe("EMPRESA");
    });

    it("Empresa de outro tenant não enxerga o contrato alheio (404)", async () => {
      const { contractId } = await createActiveContract();
      const { empresaToken: outraEmpresaToken } = await createCompanyWithEmpresaToken();

      await request(app.getHttpServer())
        .get(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${outraEmpresaToken}`)
        .expect(404);
    });
  });
});
