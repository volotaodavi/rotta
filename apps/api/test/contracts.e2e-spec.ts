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
 * E2E de geração/assinatura/ativação de contrato (briefing "Marketplace"
 * §"CONTRATO"/"ROTTA AI") — cobre o caminho feliz completo: solicitação
 * Aprovada -> contrato gerado (`AGUARDANDO_ASSINATURA`, Authentique
 * indisponível de forma esperada e não-bloqueante) -> assinatura dos
 * dois lados -> ativação automática (`ATIVO`) assim que a segunda
 * assinatura chega, mesmo com a Rotta AI indisponível (ver nota em
 * `ContractsService.tryActivateAfterBothSigned`).
 */
describe("Marketplace — contratos (e2e)", () => {
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

  async function createApprovedRequest(responsavelToken: string, companyId: string) {
    const created = await request(app.getHttpServer())
      .post("/v1/marketplace/transport-requests")
      .set("Authorization", `Bearer ${responsavelToken}`)
      .send({ companyId, novoAluno: validStudentPayload() })
      .expect(201);
    return created.body.data.id as string;
  }

  const validContractPayload = () => ({
    valorMensalidadeCentavos: 35000,
    planoDescricao: "Mensal — ida e volta",
    regras: "Cancelamento com 30 dias de antecedência.",
    vigenciaInicio: "2026-02-01",
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

  describe("POST /v1/marketplace/transport-requests/:id/contract", () => {
    it("rejeita quando a solicitação ainda não foi aprovada", async () => {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();
      const requestId = await createApprovedRequest(token, companyId);

      await request(app.getHttpServer())
        .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validContractPayload())
        .expect(403);
    });

    it("Responsável não pode gerar contrato (403) — exclusivo da Empresa", async () => {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();
      const requestId = await createApprovedRequest(token, companyId);
      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${requestId}/aprovar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
        .set("Authorization", `Bearer ${token}`)
        .send(validContractPayload())
        .expect(403);
    });

    it("gera o contrato (AGUARDANDO_ASSINATURA) a partir de uma solicitação Aprovada", async () => {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();
      const requestId = await createApprovedRequest(token, companyId);
      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${requestId}/aprovar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validContractPayload())
        .expect(201);

      expect(response.body.data.status).toBe("AGUARDANDO_ASSINATURA");
      expect(response.body.data.authentiqueDocumentId).toBeNull();
      expect(response.body.data.valorMensalidadeCentavos).toBe(35000);
    });

    it("rejeita gerar um segundo contrato para a mesma solicitação (409)", async () => {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();
      const requestId = await createApprovedRequest(token, companyId);
      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${requestId}/aprovar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validContractPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validContractPayload())
        .expect(409);
    });
  });

  describe("Assinatura", () => {
    async function createContract() {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();
      const requestId = await createApprovedRequest(token, companyId);
      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${requestId}/aprovar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      const created = await request(app.getHttpServer())
        .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validContractPayload())
        .expect(201);
      return { contractId: created.body.data.id as string, responsavelToken: token, empresaToken };
    }

    it("cada lado só assina o seu (Empresa não pode assinar como Responsável)", async () => {
      const { contractId, empresaToken } = await createContract();

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(403);
    });

    it("assina dos dois lados com sucesso; rejeita assinatura duplicada; ainda não ativa após só um lado", async () => {
      const { contractId, responsavelToken, empresaToken } = await createContract();

      const respAssina = await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(200);
      expect(respAssina.body.data.assinadoResponsavelEm).not.toBeNull();
      expect(respAssina.body.data.status).toBe("AGUARDANDO_ASSINATURA");

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(409);

      const empresaAssina = await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-empresa`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(empresaAssina.body.data.assinadoEmpresaEm).not.toBeNull();
    });

    it("Responsável de outro contrato não consegue assinar (404)", async () => {
      const { contractId } = await createContract();
      const outro = await createResponsavel();

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
        .set("Authorization", `Bearer ${outro.token}`)
        .expect(404);
    });
  });

  describe("Ativação automática pós-assinatura (briefing ROTTA AI)", () => {
    async function createContract() {
      const { token } = await createResponsavel();
      const { companyId, empresaToken } = await createCompanyWithEmpresaToken();
      const requestId = await createApprovedRequest(token, companyId);
      await request(app.getHttpServer())
        .patch(`/v1/marketplace/transport-requests/${requestId}/aprovar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      const created = await request(app.getHttpServer())
        .post(`/v1/marketplace/transport-requests/${requestId}/contract`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send(validContractPayload())
        .expect(201);
      return { contractId: created.body.data.id as string, responsavelToken: token, empresaToken };
    }

    it("ativa automaticamente assim que a segunda assinatura chega (Empresa assina por último)", async () => {
      const { contractId, responsavelToken, empresaToken } = await createContract();

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(200);

      const final = await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-empresa`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      expect(final.body.data.status).toBe("ATIVO");
      expect(final.body.data.ativadoEm).not.toBeNull();

      const persisted = await prisma.contract.findUnique({ where: { id: contractId } });
      expect(persisted?.status).toBe("ATIVO");
    });

    it("ativa automaticamente quando o Responsável assina por último", async () => {
      const { contractId, responsavelToken, empresaToken } = await createContract();

      await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-empresa`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);

      const final = await request(app.getHttpServer())
        .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(200);

      expect(final.body.data.status).toBe("ATIVO");
    });
  });
});
