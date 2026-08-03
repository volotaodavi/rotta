import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";


const SAO_PAULO = { latitude: -23.561684, longitude: -46.655981 };
const FORTALEZA = { latitude: -3.7327, longitude: -38.5267 };

/**
 * E2E da busca de transportadores (briefing "Marketplace" §"BUSCA"/
 * "FILTROS"/"TRANSPORTADORES"/"ROTTA AI" — selo Verificado). `companies`/
 * `vehicles`/`vehicle_documents`/`contracts`/`ratings` têm RLS — os
 * fixtures usam `withBypass` (via `set_config('app.bypass_rls', 'on', ...)`,
 * mesma convenção de `students.e2e-spec.ts`) para montar cenários
 * cross-tenant que nenhum tenant isolado poderia criar sozinho.
 */
describe("Marketplace — busca de transportadores (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const adminUserId = randomUUID();
  let planId: string;

  async function createResponsavelToken() {
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
    return signTestToken({
      sub: userId,
      tenantId: null,
      role: Role.RESPONSAVEL,
      vinculoId: userId,
    });
  }

  async function createEmpresaToken(companyId: string) {
    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        nome: "Admin Empresa (teste)",
        email: `empresa-${userId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });
    await prisma.membership.create({ data: { userId, companyId, role: Role.EMPRESA } });
    return signTestToken({
      sub: userId,
      tenantId: companyId,
      role: Role.EMPRESA,
      vinculoId: randomUUID(),
    });
  }

  async function createCompany(overrides: Record<string, unknown> = {}) {
    return prisma.company.create({
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
  }

  async function createVehicle(companyId: string, overrides: Record<string, unknown> = {}) {
    return prisma.vehicle.create({
      data: {
        companyId,
        placa: `TST${Math.floor(1000 + Math.random() * 8999)}`,
        modelo: "Sprinter",
        capacidadePassageiros: 20,
        tipo: "VAN",
        status: "DISPONIVEL",
        ...overrides,
      },
    });
  }

  const REQUIRED_DOC_TYPES = ["CRLV", "LICENCIAMENTO", "SEGURO", "VISTORIA"] as const;

  async function approveAllRequiredDocuments(vehicleId: string, companyId: string) {
    for (const tipo of REQUIRED_DOC_TYPES) {
      await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          companyId,
          tipo,
          nomeOriginal: `${tipo}.pdf`,
          mimeType: "application/pdf",
          fileUrl: `https://storage.example.com/${tipo}.pdf`,
          rottaAiStatus: "APROVADO",
          uploadedByUserId: adminUserId,
        },
      });
    }
  }

  async function createActiveContractWithStudent(input: {
    companyId: string;
    valorMensalidadeCentavos: number;
  }) {
    const responsavelId = randomUUID();
    await prisma.user.create({
      data: {
        id: responsavelId,
        nome: "Responsável do Contrato (teste)",
        email: `contrato-${responsavelId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
        isResponsavel: true,
      },
    });
    const school = await prisma.school.create({
      data: {
        codigoInterno: `ESC-TEST-${randomUUID().slice(0, 8)}`,
        nomeOficial: "EMEF Teste Marketplace",
        dependenciaAdministrativa: "MUNICIPAL",
        cep: "01310100",
        logradouro: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        tipos: ["FUNDAMENTAL"],
        turnosAtendidos: ["MANHA"],
      },
    });
    const student = await prisma.student.create({
      data: {
        responsavelId,
        nome: "Aluno Teste",
        dataNascimento: new Date("2015-01-01"),
        sexo: "FEMININO",
        schoolId: school.id,
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
      },
    });
    const transportRequest = await prisma.transportRequest.create({
      data: {
        studentId: student.id,
        responsavelId,
        companyId: input.companyId,
        schoolId: school.id,
        turno: "MANHA",
        status: "APROVADA",
      },
    });
    const contract = await prisma.contract.create({
      data: {
        transportRequestId: transportRequest.id,
        studentId: student.id,
        responsavelId,
        companyId: input.companyId,
        schoolId: school.id,
        valorMensalidadeCentavos: input.valorMensalidadeCentavos,
        planoDescricao: "Mensal",
        regras: "Sem regras especiais.",
        vigenciaInicio: new Date(),
        status: "ATIVO",
        ativadoEm: new Date(),
      },
    });
    return { contract, responsavelId };
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
  });

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.rating.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.transportRequest.deleteMany();
    await prisma.student.deleteMany();
    await prisma.vehicleDocument.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.membership.deleteMany();
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
    await prisma.vehicleDocument.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.company.deleteMany();
    await prisma.school.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("GET /v1/marketplace/transporters", () => {
    it("rejeita requisição sem token (401)", async () => {
      await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query(SAO_PAULO)
        .expect(401);
    });

    it("Empresa não pode buscar no marketplace (403) — só Responsável/Admin Rotta", async () => {
      const company = await createCompany();
      const empresaToken = await createEmpresaToken(company.id);

      await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query(SAO_PAULO)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(403);
    });

    it("encontra empresa ATIVO próxima e calcula a distância", async () => {
      const token = await createResponsavelToken();
      const company = await createCompany();

      const response = await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query(SAO_PAULO)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const item = response.body.data.items.find((i: { id: string }) => i.id === company.id);
      expect(item).toBeDefined();
      expect(item.distanciaKm).toBeCloseTo(0, 1);
    });

    it("exclui empresas fora do raioKm informado", async () => {
      const token = await createResponsavelToken();
      const perto = await createCompany();
      const longe = await createCompany({
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
        cidade: "Fortaleza",
        estado: "CE",
        latitude: FORTALEZA.latitude,
        longitude: FORTALEZA.longitude,
      });

      const response = await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query({ ...SAO_PAULO, raioKm: 100 })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ids = response.body.data.items.map((i: { id: string }) => i.id);
      expect(ids).toContain(perto.id);
      expect(ids).not.toContain(longe.id);
    });

    it("empresa SUSPENSO nunca aparece na busca (mesmo dentro do raio)", async () => {
      const token = await createResponsavelToken();
      const suspensa = await createCompany({ status: "SUSPENSO" });

      const response = await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query(SAO_PAULO)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ids = response.body.data.items.map((i: { id: string }) => i.id);
      expect(ids).not.toContain(suspensa.id);
    });

    it("selo Verificado: só true quando todos os veículos ativos têm os 4 documentos aprovados e em dia", async () => {
      const token = await createResponsavelToken();
      const semDocumentos = await createCompany();
      await createVehicle(semDocumentos.id);

      const comDocumentosOk = await createCompany({
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
      });
      const vehicle = await createVehicle(comDocumentosOk.id);
      await approveAllRequiredDocuments(vehicle.id, comDocumentosOk.id);

      const response = await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query(SAO_PAULO)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const items = response.body.data.items as { id: string; verificado: boolean }[];
      expect(items.find((i) => i.id === semDocumentos.id)?.verificado).toBe(false);
      expect(items.find((i) => i.id === comDocumentosOk.id)?.verificado).toBe(true);

      const apenasVerificados = await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query({ ...SAO_PAULO, apenasVerificados: true })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const idsVerificados = apenasVerificados.body.data.items.map((i: { id: string }) => i.id);
      expect(idsVerificados).toEqual([comDocumentosOk.id]);
    });

    it("reflete alunos transportados e mensalidade a partir de contratos ativos", async () => {
      const token = await createResponsavelToken();
      const company = await createCompany();
      await createActiveContractWithStudent({
        companyId: company.id,
        valorMensalidadeCentavos: 40_000,
      });
      await createActiveContractWithStudent({
        companyId: company.id,
        valorMensalidadeCentavos: 25_000,
      });

      const response = await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query(SAO_PAULO)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const item = response.body.data.items.find((i: { id: string }) => i.id === company.id);
      expect(item.alunosTransportados).toBe(2);
      expect(item.mensalidadeAPartirDeCentavos).toBe(25_000);
    });

    it("filtra por escolaId (só empresas com SchoolCompanyLink ativo)", async () => {
      const token = await createResponsavelToken();
      const school = await prisma.school.create({
        data: {
          codigoInterno: `ESC-TEST-${randomUUID().slice(0, 8)}`,
          nomeOficial: "EMEF Filtro Escola",
          dependenciaAdministrativa: "MUNICIPAL",
          cep: "01310100",
          logradouro: "Avenida Paulista",
          numero: "1000",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          estado: "SP",
          tipos: ["FUNDAMENTAL"],
          turnosAtendidos: ["MANHA"],
        },
      });
      const atende = await createCompany();
      const naoAtende = await createCompany({
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
      });
      await prisma.schoolCompanyLink.create({
        data: { schoolId: school.id, companyId: atende.id, vinculadoPorId: adminUserId },
      });

      const response = await request(app.getHttpServer())
        .get("/v1/marketplace/transporters")
        .query({ ...SAO_PAULO, escolaId: school.id })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ids = response.body.data.items.map((i: { id: string }) => i.id);
      expect(ids).toContain(atende.id);
      expect(ids).not.toContain(naoAtende.id);
    });
  });

  describe("GET /v1/marketplace/transporters/:id", () => {
    it("404 para empresa inexistente", async () => {
      const token = await createResponsavelToken();
      await request(app.getHttpServer())
        .get(`/v1/marketplace/transporters/${randomUUID()}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna detalhes com avaliações recentes", async () => {
      const token = await createResponsavelToken();
      const company = await createCompany();
      const { contract, responsavelId } = await createActiveContractWithStudent({
        companyId: company.id,
        valorMensalidadeCentavos: 30_000,
      });
      await prisma.rating.create({
        data: {
          contractId: contract.id,
          responsavelId,
          companyId: company.id,
          alvoTipo: "EMPRESA",
          alvoId: company.id,
          nota: 5,
          comentario: "Ótimo atendimento!",
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/v1/marketplace/transporters/${company.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.razaoSocial).toBe(company.razaoSocial);
      expect(response.body.data.avaliacaoMedia).toBe(5);
      expect(response.body.data.avaliacoesRecentes).toHaveLength(1);
      expect(response.body.data.avaliacoesRecentes[0].comentario).toBe("Ótimo atendimento!");
    });
  });
});
