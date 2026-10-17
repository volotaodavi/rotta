import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { FamilyBillingService } from "@/modules/family-billing/family-billing.service";
import { Role } from "@/shared/enums";

/**
 * E2E da cobrança da família — a mensalidade que o Responsável paga à
 * TRANSPORTADORA.
 *
 * O que este arquivo prova contra um Postgres de verdade, e que teste de
 * unidade com mock não prova:
 *
 * 1. A geração mensal é idempotente. A consulta que a sustenta
 *    (`faturas: { none: { competencia } }`) e a restrição
 *    `@@unique([contractId, competencia])` só existem no banco.
 * 2. O Responsável lê a fatura do próprio filho cruzando tenants (ele
 *    não tem tenant), e NÃO lê a de outra família.
 * 3. `VENCIDA` sai de um `UPDATE` em massa por data, não de lógica em
 *    memória.
 *
 * A geração é disparada pelo serviço resolvido do próprio container do
 * Nest (não por HTTP) porque o único caminho HTTP dela é o worker do
 * QStash, protegido por assinatura — o que está sendo testado aqui é a
 * consulta, não o guard.
 */
describe("Cobrança da família (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let familyBilling: FamilyBillingService;

  let companyId: string;
  let planId: string;
  let schoolId: string;
  let empresaToken: string;
  let responsavelToken: string;
  let outroResponsavelToken: string;
  let studentId: string;
  let outroStudentId: string;
  let contractId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    familyBilling = app.get(FamilyBillingService);

    prisma = new PrismaClient();
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;

    const plan = await prisma.plan.upsert({
      where: { code: "starter" },
      update: {},
      create: { code: "starter", name: "Starter", priceCents: 9900, isActive: true },
    });
    planId = plan.id;
  });

  afterAll(async () => {
    await limpar();
    await prisma.$disconnect();
    await app.close();
  });

  async function limpar(): Promise<void> {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.walletTransaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.contractInvoice.deleteMany();
    await prisma.companyPaymentAccount.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.transportRequest.deleteMany();
    await prisma.student.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.school.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
  }

  /** Dois contratos ativos de transportadoras/famílias diferentes, montados direto no banco. */
  beforeEach(async () => {
    await limpar();

    const company = await prisma.company.create({
      data: {
        codigoInterno: `EMP-FB-${randomUUID().slice(0, 8)}`,
        razaoSocial: "Transportes Lima LTDA",
        nomeFantasia: "Transportes Lima",
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
        tipo: "LTDA",
        email: `empresa-${randomUUID()}@teste.com.br`,
        telefone: "11999990000",
        cep: "01310100",
        endereco: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        status: "ATIVO",
        planId,
      },
    });
    companyId = company.id;

    const school = await prisma.school.create({
      data: {
        codigoInterno: `ESC-FB-${randomUUID().slice(0, 8)}`,
        nomeOficial: "EMEF Teste Cobranca",
        dependenciaAdministrativa: "MUNICIPAL",
        cep: "01310100",
        logradouro: "Avenida Paulista",
        numero: "1500",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        tipos: ["FUNDAMENTAL"],
        turnosAtendidos: ["MANHA", "TARDE"],
      },
    });
    schoolId = school.id;

    const empresaUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: empresaUserId,
        nome: "Dona da Empresa",
        email: `dona-${empresaUserId}@teste.com.br`,
        telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });
    await prisma.membership.create({
      data: { userId: empresaUserId, companyId, role: Role.EMPRESA },
    });
    empresaToken = signTestToken({
      sub: empresaUserId,
      tenantId: companyId,
      role: Role.EMPRESA,
      vinculoId: randomUUID(),
    });

    const criarFamilia = async (nome: string) => {
      const userId = randomUUID();
      await prisma.user.create({
        data: {
          id: userId,
          nome,
          email: `resp-${userId}@teste.com.br`,
          telefone: `11${Math.floor(900000000 + Math.random() * 99999999)}`,
          cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
          passwordHash: "x",
          isResponsavel: true,
        },
      });
      const student = await prisma.student.create({
        data: {
          responsavelId: userId,
          schoolId,
          nome: `Aluno de ${nome}`,
          dataNascimento: new Date("2015-03-20"),
          sexo: "FEMININO",
          turno: "MANHA",
          embarqueCep: "01310100",
          embarqueLogradouro: "Avenida Paulista",
          embarqueNumero: "1000",
          embarqueBairro: "Bela Vista",
          embarqueCidade: "São Paulo",
          embarqueEstado: "SP",
          desembarqueCep: "01310100",
          desembarqueLogradouro: "Avenida Paulista",
          desembarqueNumero: "1500",
          desembarqueBairro: "Bela Vista",
          desembarqueCidade: "São Paulo",
          desembarqueEstado: "SP",
        },
      });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: randomUUID(),
      });
      return { userId, studentId: student.id, token };
    };

    const familia = await criarFamilia("Maria");
    const outraFamilia = await criarFamilia("Joana");
    studentId = familia.studentId;
    outroStudentId = outraFamilia.studentId;
    responsavelToken = familia.token;
    outroResponsavelToken = outraFamilia.token;

    const criarContrato = async (
      dados: { studentId: string; responsavelId: string },
      valorCentavos: number,
    ) => {
      const solicitacao = await prisma.transportRequest.create({
        data: {
          companyId,
          studentId: dados.studentId,
          responsavelId: dados.responsavelId,
          schoolId,
          turno: "MANHA",
          status: "APROVADA",
        },
      });
      return prisma.contract.create({
        data: {
          transportRequestId: solicitacao.id,
          companyId,
          studentId: dados.studentId,
          responsavelId: dados.responsavelId,
          schoolId,
          valorMensalidadeCentavos: valorCentavos,
          planoDescricao: "Ida e volta",
          regras: "Pagamento até o dia 5",
          vigenciaInicio: new Date("2026-02-01"),
          status: "ATIVO",
          ativadoEm: new Date("2026-02-01"),
        },
      });
    };

    const contrato = await criarContrato({ studentId, responsavelId: familia.userId }, 66_000);
    contractId = contrato.id;
    await criarContrato({ studentId: outroStudentId, responsavelId: outraFamilia.userId }, 50_000);
  });

  describe("geração mensal", () => {
    it("emite uma fatura por contrato ativo e não duplica ao rodar de novo", async () => {
      const primeira = await familyBilling.gerarFaturasDaCompetencia(
        new Date("2026-04-17T12:00:00.000Z"),
      );
      expect(primeira).toMatchObject({
        competencia: "2026-04-01",
        contratosAvaliados: 2,
        faturasCriadas: 2,
        falhas: 0,
      });

      // A idempotência é do banco (`@@unique([contractId, competencia])`),
      // não de uma trava em memória: a segunda execução não acha
      // contrato nenhum para faturar.
      const segunda = await familyBilling.gerarFaturasDaCompetencia(
        new Date("2026-04-23T12:00:00.000Z"),
      );
      expect(segunda).toMatchObject({ contratosAvaliados: 0, faturasCriadas: 0, falhas: 0 });

      const total = await prisma.contractInvoice.count();
      expect(total).toBe(2);
    });

    it("congela o valor do contrato: reajuste depois não muda fatura emitida", async () => {
      await familyBilling.gerarFaturasDaCompetencia(new Date("2026-04-17T12:00:00.000Z"));
      await prisma.contract.update({
        where: { id: contractId },
        data: { valorMensalidadeCentavos: 99_000 },
      });

      const fatura = await prisma.contractInvoice.findFirst({ where: { contractId } });
      expect(fatura?.valorCentavos).toBe(66_000);
    });

    it("contrato com mensalidade zero não gera fatura de nada", async () => {
      await prisma.contract.update({
        where: { id: contractId },
        data: { valorMensalidadeCentavos: 0 },
      });

      const resultado = await familyBilling.gerarFaturasDaCompetencia(
        new Date("2026-05-10T12:00:00.000Z"),
      );

      expect(resultado.contratosAvaliados).toBe(1);
      const doContrato = await prisma.contractInvoice.count({ where: { contractId } });
      expect(doContrato).toBe(0);
    });

    it("vence o que passou do dia, e só isso", async () => {
      await familyBilling.gerarFaturasDaCompetencia(new Date("2026-04-17T12:00:00.000Z"));
      await prisma.contractInvoice.updateMany({
        where: { contractId },
        data: { vencimento: new Date("2026-04-05") },
      });
      await prisma.contractInvoice.updateMany({
        where: { contractId: { not: contractId } },
        data: { vencimento: new Date("2099-01-05") },
      });

      const vencidas = await familyBilling.marcarFaturasVencidas(
        new Date("2026-04-20T12:00:00.000Z"),
      );

      expect(vencidas).toBe(1);
      const minha = await prisma.contractInvoice.findFirst({ where: { contractId } });
      expect(minha?.status).toBe("VENCIDA");
      const outra = await prisma.contractInvoice.findFirst({
        where: { contractId: { not: contractId } },
      });
      expect(outra?.status).toBe("A_VENCER");
    });
  });

  describe("o que o Responsável vê", () => {
    beforeEach(async () => {
      await familyBilling.gerarFaturasDaCompetencia(new Date("2026-04-17T12:00:00.000Z"));
    });

    it("lê a fatura do próprio filho, cruzando tenants (ele não tem tenant)", async () => {
      const resposta = await request(app.getHttpServer())
        .get(`/v1/family-billing/students/${studentId}/pagamentos`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(200);

      expect(resposta.body.data.faturas).toHaveLength(1);
      expect(resposta.body.data.faturas[0]).toMatchObject({
        competenciaRotulo: "Abr/2026",
        vencimento: "2026-04-05",
        valorCentavos: 66_000,
        status: "A_VENCER",
        transportadoraNome: "Transportes Lima",
      });
      expect(resposta.body.data.totalEmAbertoCentavos).toBe(66_000);
      expect(resposta.body.data.totalEmAbertoFormatado).toContain("660,00");
    });

    it("não lê a fatura da outra família", async () => {
      await request(app.getHttpServer())
        .get(`/v1/family-billing/students/${studentId}/pagamentos`)
        .set("Authorization", `Bearer ${outroResponsavelToken}`)
        .expect(404);
    });

    it("sem Asaas configurada, diz que não dá para pagar pelo app em vez de oferecer", async () => {
      const resposta = await request(app.getHttpServer())
        .get(`/v1/family-billing/students/${studentId}/pagamentos`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(200);

      // Este ambiente não tem `ASAAS_API_KEY` — a flag reflete isso, e os
      // valores continuam reais.
      expect(resposta.body.data.pagamentoNoAppDisponivel).toBe(false);

      const fatura = await prisma.contractInvoice.findFirst({ where: { contractId } });
      await request(app.getHttpServer())
        .post(`/v1/family-billing/invoices/${fatura!.id}/pagamento-pix`)
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(400);
    });
  });

  describe("o que a transportadora vê", () => {
    beforeEach(async () => {
      await familyBilling.gerarFaturasDaCompetencia(new Date("2026-04-17T12:00:00.000Z"));
    });

    it("lista as próprias contas a receber, com filtro por situação", async () => {
      const todas = await request(app.getHttpServer())
        .get("/v1/family-billing/invoices")
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(todas.body.data.total).toBe(2);

      const pagas = await request(app.getHttpServer())
        .get("/v1/family-billing/invoices?status=PAGA")
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(pagas.body.data.total).toBe(0);
    });

    it("o Responsável não lista contas a receber de transportadora nenhuma", async () => {
      await request(app.getHttpServer())
        .get("/v1/family-billing/invoices")
        .set("Authorization", `Bearer ${responsavelToken}`)
        .expect(403);
    });

    it("informa a chave Pix de recebimento, e o split segue desligado até a Asaas liberar", async () => {
      const salva = await request(app.getHttpServer())
        .put("/v1/family-billing/conta-de-recebimento")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ chavePix: "11999998888" })
        .expect(200);

      expect(salva.body.data).toMatchObject({
        chavePix: "11999998888",
        status: "PENDENTE",
        asaasWalletId: null,
        taxaDaPlataformaBps: 0,
      });
    });

    it("transportador não escreve o próprio asaasWalletId (redirecionaria o split)", async () => {
      await request(app.getHttpServer())
        .put("/v1/family-billing/conta-de-recebimento")
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ chavePix: "11999998888", asaasWalletId: "wal_do_atacante" })
        .expect(400);
    });
  });

  describe("pagamento confirmado", () => {
    it("marca paga e credita o Rotta Pay do transportador quando não há split", async () => {
      await familyBilling.gerarFaturasDaCompetencia(new Date("2026-04-17T12:00:00.000Z"));
      const fatura = await prisma.contractInvoice.findFirstOrThrow({ where: { contractId } });
      await prisma.contractInvoice.update({
        where: { id: fatura.id },
        data: { asaasPaymentId: "pay_teste_1" },
      });

      await familyBilling.confirmarPagamento({
        asaasPaymentId: "pay_teste_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        pagoEm: new Date("2026-04-03T12:00:00.000Z"),
      });

      const paga = await prisma.contractInvoice.findUniqueOrThrow({ where: { id: fatura.id } });
      expect(paga).toMatchObject({
        status: "PAGA",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        repasseCentavos: 65_801,
      });

      const wallet = await prisma.wallet.findFirstOrThrow({ where: { companyId } });
      expect(wallet.saldoDisponivelCentavos).toBe(65_801);

      const lancamento = await prisma.walletTransaction.findFirstOrThrow({
        where: { contractInvoiceId: fatura.id },
      });
      expect(lancamento).toMatchObject({
        tipo: "CREDITO_MENSALIDADE",
        status: "CONCLUIDA",
        valorCentavos: 65_801,
      });

      // A Asaas reentrega webhook: a segunda vez não pode creditar de novo.
      await familyBilling.confirmarPagamento({
        asaasPaymentId: "pay_teste_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        pagoEm: new Date("2026-04-03T12:00:00.000Z"),
      });
      const depois = await prisma.wallet.findFirstOrThrow({ where: { companyId } });
      expect(depois.saldoDisponivelCentavos).toBe(65_801);
    });
  });
});
