import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";

const SAO_PAULO = { latitude: -23.561684, longitude: -46.655981 };
const THIRTY_ONE_DAYS_AGO = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
const REQUIRED_DOC_TYPES = ["CRLV", "LICENCIAMENTO", "SEGURO", "VISTORIA"] as const;

/**
 * Teste de PONTA A PONTA do módulo Marketplace (critério de fechamento
 * explícito do briefing: "Somente considerar este módulo concluído
 * quando todo o Marketplace estiver funcionando de ponta a ponta, desde
 * a busca de transportadores até a contratação, assinatura do
 * contrato, ativação automática do transporte..."). Um único fluxo
 * contínuo, sem atalhos de fixture além dos estritamente necessários
 * (geocodificação/Authentique/Rotta AI são stubs — indisponibilidade
 * deles é verificada como não-bloqueante, nunca contornada): busca
 * (com selo Verificado) -> detalhe -> solicitação (com cadastro inline
 * do aluno) -> Em análise -> Aprovada -> contrato gerado -> assinatura
 * dos dois lados -> ativação automática -> avaliação após 30 dias.
 *
 * "Exibição do veículo em tempo real" (mesmo critério) não é testada
 * aqui: os campos `Vehicle.ultimaLatitude/ultimaLongitude/ultimaPosicaoEm`
 * já existem e são cobertos pelos testes do módulo Veículos — não há
 * pipeline de GPS real neste monorepo ainda (lacuna já documentada em
 * `Vehicle.viagemAtualId`, schema.prisma).
 */
describe("Marketplace — pipeline de ponta a ponta (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const adminUserId = randomUUID();
  let planId: string;

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
    await prisma.auditLog.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.withdrawalRequest.deleteMany();
    await prisma.company.deleteMany();
    await prisma.school.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
    await prisma.$disconnect();
    await app.close();
  });

  it("busca -> detalhe -> solicitação -> aprovação -> contrato -> assinatura -> ativação -> avaliação", async () => {
    // --- Fundação: Responsável, Escola e Empresa/transportador (com selo Verificado) ---
    const responsavelId = randomUUID();
    await prisma.user.create({
      data: {
        id: responsavelId,
        nome: "Beatriz Responsável (teste)",
        email: `beatriz-${responsavelId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
        isResponsavel: true,
      },
    });
    const responsavelToken = signTestToken({
      sub: responsavelId,
      tenantId: null,
      role: Role.RESPONSAVEL,
      vinculoId: responsavelId,
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
        turnosAtendidos: ["MANHA"],
      },
    });

    const company = await prisma.company.create({
      data: {
        codigoInterno: `EMP-TEST-${randomUUID().slice(0, 8)}`,
        razaoSocial: "Transporte Escolar Ponta a Ponta LTDA",
        nomeFantasia: "PontaAPonta Transportes",
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
        tipo: "LTDA",
        email: "contato@pontaaponta-teste.com.br",
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

    const vehicle = await prisma.vehicle.create({
      data: {
        companyId: company.id,
        placa: `TST${Math.floor(1000 + Math.random() * 8999)}`,
        modelo: "Sprinter",
        capacidadePassageiros: 20,
        tipo: "VAN",
        status: "DISPONIVEL",
      },
    });
    for (const tipo of REQUIRED_DOC_TYPES) {
      await prisma.vehicleDocument.create({
        data: {
          vehicleId: vehicle.id,
          companyId: company.id,
          tipo,
          nomeOriginal: `${tipo}.pdf`,
          mimeType: "application/pdf",
          fileUrl: `https://storage.example.com/${tipo}.pdf`,
          rottaAiStatus: "APROVADO",
          uploadedByUserId: adminUserId,
        },
      });
    }
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

    // --- 1) BUSCA: transportador aparece próximo, com selo Verificado ---
    const search = await request(app.getHttpServer())
      .get("/v1/marketplace/transporters")
      .query(SAO_PAULO)
      .set("Authorization", `Bearer ${responsavelToken}`)
      .expect(200);
    const cartao = search.body.data.items.find((i: { id: string }) => i.id === company.id);
    expect(cartao).toBeDefined();
    expect(cartao.verificado).toBe(true);
    expect(cartao.distanciaKm).toBeCloseTo(0, 1);

    // --- 2) DETALHE ---
    const detalhe = await request(app.getHttpServer())
      .get(`/v1/marketplace/transporters/${company.id}`)
      .set("Authorization", `Bearer ${responsavelToken}`)
      .expect(200);
    expect(detalhe.body.data.razaoSocial).toBe(company.razaoSocial);

    // --- 3) SOLICITAR TRANSPORTE (com cadastro inline do aluno) ---
    const transportRequestResponse = await request(app.getHttpServer())
      .post("/v1/marketplace/transport-requests")
      .set("Authorization", `Bearer ${responsavelToken}`)
      .send({
        companyId: company.id,
        novoAluno: {
          nome: "Aluno Ponta a Ponta",
          dataNascimento: "2015-03-20",
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
      })
      .expect(201);
    expect(transportRequestResponse.body.data.status).toBe("RECEBIDA");
    const transportRequestId = transportRequestResponse.body.data.id as string;

    // --- 4) FLUXO DE APROVAÇÃO: Recebida -> Em análise -> Aprovada ---
    const emAnalise = await request(app.getHttpServer())
      .patch(`/v1/marketplace/transport-requests/${transportRequestId}/em-analise`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .expect(200);
    expect(emAnalise.body.data.status).toBe("EM_ANALISE");

    const aprovada = await request(app.getHttpServer())
      .patch(`/v1/marketplace/transport-requests/${transportRequestId}/aprovar`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .expect(200);
    expect(aprovada.body.data.status).toBe("APROVADA");

    // --- 5) GERAÇÃO DE CONTRATO (Authentique indisponível, best-effort, não bloqueia) ---
    const contractResponse = await request(app.getHttpServer())
      .post(`/v1/marketplace/transport-requests/${transportRequestId}/contract`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .send({
        valorMensalidadeCentavos: 35000,
        planoDescricao: "Mensal — ida e volta",
        regras: "Cancelamento com 30 dias de antecedência.",
        vigenciaInicio: "2026-02-01",
        vehicleId: vehicle.id,
        motoristaId,
        monitorId,
      })
      .expect(201);
    expect(contractResponse.body.data.status).toBe("AGUARDANDO_ASSINATURA");
    expect(contractResponse.body.data.authentiqueDocumentId).toBeNull();
    const contractId = contractResponse.body.data.id as string;

    // --- 6) ASSINATURA DOS DOIS LADOS -> ATIVAÇÃO AUTOMÁTICA (Rotta AI indisponível, best-effort) ---
    await request(app.getHttpServer())
      .patch(`/v1/marketplace/contracts/${contractId}/assinar-responsavel`)
      .set("Authorization", `Bearer ${responsavelToken}`)
      .expect(200);
    const ativado = await request(app.getHttpServer())
      .patch(`/v1/marketplace/contracts/${contractId}/assinar-empresa`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .expect(200);
    expect(ativado.body.data.status).toBe("ATIVO");
    expect(ativado.body.data.ativadoEm).not.toBeNull();

    const contratoNoBanco = await prisma.contract.findUnique({ where: { id: contractId } });
    expect(contratoNoBanco?.status).toBe("ATIVO");

    // --- 7) AVALIAÇÕES (liberadas 30 dias após ativação) ---
    await prisma.contract.update({
      where: { id: contractId },
      data: { ativadoEm: THIRTY_ONE_DAYS_AGO },
    });

    for (const alvoTipo of ["EMPRESA", "MOTORISTA", "MONITOR", "VEICULO"]) {
      await request(app.getHttpServer())
        .post(`/v1/marketplace/contracts/${contractId}/ratings`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .send({ alvoTipo, nota: 5, comentario: `Excelente ${alvoTipo}!` })
        .expect(201);
    }

    const ratingsList = await request(app.getHttpServer())
      .get(`/v1/marketplace/contracts/${contractId}/ratings`)
      .set("Authorization", `Bearer ${empresaToken}`)
      .expect(200);
    expect(ratingsList.body.data).toHaveLength(4);

    // --- Fecha o ciclo: as avaliações já aparecem na busca/detalhe pública ---
    // `avaliacaoMedia`/`totalAvaliacoes` agregam TODAS as `Rating`s da
    // empresa (qualquer `alvoTipo`), não só as do tipo EMPRESA — as 4
    // notas 5 registradas acima entram todas na média.
    const detalheComAvaliacao = await request(app.getHttpServer())
      .get(`/v1/marketplace/transporters/${company.id}`)
      .set("Authorization", `Bearer ${responsavelToken}`)
      .expect(200);
    expect(detalheComAvaliacao.body.data.avaliacaoMedia).toBe(5);
    expect(detalheComAvaliacao.body.data.totalAvaliacoes).toBe(4);
  });
});
