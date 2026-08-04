import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";


/**
 * E2E do Rotta Communication Engine (briefing "MÓDULO — ROTTA
 * COMMUNICATION ENGINE") — aplicação Nest completa contra o Postgres de
 * teste real. Cobre a Central de Notificações Internas (inbox pessoal),
 * dispositivos/preferências (com sua auditoria), e o dashboard/audit-log
 * agregado por empresa. `Notification`/`NotificationDeliveryAttempt`/
 * `AuditLog` são inseridos via fixture direta (o disparo automático real
 * vive nos módulos de domínio — Students/Schools/Marketplace/Auth —
 * já cobertos pelos próprios testes deles).
 */
describe("Notifications / Communication Engine (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const adminUserId = randomUUID();

  function randomTelefone(): string {
    return `11${Math.floor(900000000 + Math.random() * 99999999)}`;
  }
  function randomCpf(): string {
    return String(Math.floor(10000000000 + Math.random() * 89999999999));
  }

  async function createUser(overrides: { nome?: string; isResponsavel?: boolean } = {}) {
    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        nome: overrides.nome ?? "Usuário (teste)",
        email: `user-${userId}@teste.com.br`,
        telefone: randomTelefone(),
        cpf: randomCpf(),
        passwordHash: "x",
        isResponsavel: overrides.isResponsavel ?? false,
      },
    });
    return userId;
  }

  async function createCompany() {
    const plan = await prisma.plan.findFirst({ where: { code: "STARTER" } });
    if (!plan) {
      throw new Error("Plano STARTER não encontrado — rode `pnpm prisma:seed`.");
    }
    return prisma.company.create({
      data: {
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
  }

  async function createNotification(overrides: {
    userId: string;
    companyId?: string;
    tipo?: string;
    titulo?: string;
    corpo?: string;
    lida?: boolean;
    favoritada?: boolean;
    arquivada?: boolean;
    canaisEscolhidos?: string[];
  }) {
    return prisma.notification.create({
      data: {
        userId: overrides.userId,
        companyId: overrides.companyId,
        tipo: (overrides.tipo ?? "NOVO_ALUNO") as never,
        prioridade: "INFORMATIVA",
        titulo: overrides.titulo ?? "Novo aluno",
        corpo: overrides.corpo ?? "Pedro foi cadastrado.",
        canaisEscolhidos: (overrides.canaisEscolhidos ?? ["IN_APP"]) as never,
        lida: overrides.lida ?? false,
        favoritada: overrides.favoritada ?? false,
        arquivada: overrides.arquivada ?? false,
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
    // Ouve de fato uma porta efêmera (nunca só `app.init()`) — os testes
    // de "carga" abaixo disparam dezenas de requisições concorrentes via
    // supertest; sem o servidor já escutando, cada uma tentaria fazer o
    // próprio `listen(0)` sob concorrência, derrubando a conexão
    // (`ECONNRESET`) em vez de reaproveitar a mesma porta.
    await app.listen(0);

    prisma = new PrismaClient();
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.user.upsert({
      where: { id: adminUserId },
      update: {},
      create: {
        id: adminUserId,
        nome: "Admin Rotta (teste)",
        email: `admin-${adminUserId}@rotta.com.br`,
        telefone: randomTelefone(),
        cpf: randomCpf(),
        passwordHash: "x",
      },
    });
  });

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.notificationDeliveryAttempt.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.notificationDeliveryAttempt.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: adminUserId } } });
  });

  describe("Central de Notificações Internas (inbox pessoal)", () => {
    it("rejeita qualquer rota sem token (401)", async () => {
      await request(app.getHttpServer()).get("/v1/notifications").expect(401);
    });

    it("GET /v1/notifications lista só as notificações do próprio usuário", async () => {
      const userId = await createUser({ isResponsavel: true });
      const outroUserId = await createUser({ isResponsavel: true });
      await createNotification({ userId });
      await createNotification({ userId: outroUserId });

      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const response = await request(app.getHttpServer())
        .get("/v1/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].titulo).toBe("Novo aluno");
      expect(response.body.data.items[0]).not.toHaveProperty("userId");
    });

    it("GET /v1/notifications filtra por lida/favoritada/arquivada/tipo/search", async () => {
      const userId = await createUser({ isResponsavel: true });
      await createNotification({ userId, titulo: "Alerta de trânsito", tipo: "OCORRENCIA" });
      await createNotification({ userId, lida: true, titulo: "Já lida" });

      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const porTipo = await request(app.getHttpServer())
        .get("/v1/notifications")
        .query({ tipo: "OCORRENCIA" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(porTipo.body.data.total).toBe(1);
      expect(porTipo.body.data.items[0].titulo).toBe("Alerta de trânsito");

      const porLida = await request(app.getHttpServer())
        .get("/v1/notifications")
        .query({ lida: "true" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(porLida.body.data.total).toBe(1);
      expect(porLida.body.data.items[0].titulo).toBe("Já lida");

      const porBusca = await request(app.getHttpServer())
        .get("/v1/notifications")
        .query({ search: "trânsito" })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(porBusca.body.data.total).toBe(1);
    });

    it("GET /v1/notifications/:id retorna 404 (nunca 403) para notificação de outro usuário", async () => {
      const userId = await createUser({ isResponsavel: true });
      const outroUserId = await createUser({ isResponsavel: true });
      const notification = await createNotification({ userId: outroUserId });

      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      await request(app.getHttpServer())
        .get(`/v1/notifications/${notification.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("PATCH /:id/lida marca como lida", async () => {
      const userId = await createUser({ isResponsavel: true });
      const notification = await createNotification({ userId });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const response = await request(app.getHttpServer())
        .patch(`/v1/notifications/${notification.id}/lida`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.lida).toBe(true);
    });

    it("POST /marcar-todas-lidas marca todas as notificações não lidas do usuário", async () => {
      const userId = await createUser({ isResponsavel: true });
      await createNotification({ userId });
      await createNotification({ userId });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const response = await request(app.getHttpServer())
        .post("/v1/notifications/marcar-todas-lidas")
        .set("Authorization", `Bearer ${token}`)
        .expect(201);

      expect(response.body.data.count).toBe(2);
    });

    it("PATCH /:id/favorita e /:id/arquivada aceitam o valor explícito", async () => {
      const userId = await createUser({ isResponsavel: true });
      const notification = await createNotification({ userId });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const favoritada = await request(app.getHttpServer())
        .patch(`/v1/notifications/${notification.id}/favorita`)
        .set("Authorization", `Bearer ${token}`)
        .send({ valor: true })
        .expect(200);
      expect(favoritada.body.data.favoritada).toBe(true);

      const arquivada = await request(app.getHttpServer())
        .patch(`/v1/notifications/${notification.id}/arquivada`)
        .set("Authorization", `Bearer ${token}`)
        .send({ valor: true })
        .expect(200);
      expect(arquivada.body.data.arquivada).toBe(true);
    });

    it("DELETE /:id exclui e registra auditoria NOTIFICATION_DELETED (sem companyId)", async () => {
      const userId = await createUser({ isResponsavel: true });
      const notification = await createNotification({ userId });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      await request(app.getHttpServer())
        .delete(`/v1/notifications/${notification.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const found = await prisma.notification.findUnique({ where: { id: notification.id } });
      expect(found).toBeNull();

      const logs = await prisma.auditLog.findMany({
        where: { entidadeTipo: "Notification", acao: "NOTIFICATION_DELETED" },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.companyId).toBeNull();
      expect(logs[0]?.atorUserId).toBe(userId);
    });
  });

  describe("Dispositivos (Token FCM)", () => {
    it("POST /dispositivos registra e DELETE /dispositivos/:token desativa", async () => {
      const userId = await createUser({ isResponsavel: true });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      await request(app.getHttpServer())
        .post("/v1/notifications/dispositivos")
        .set("Authorization", `Bearer ${token}`)
        .send({ token: "fcm-token-de-teste-123", plataforma: "ANDROID" })
        .expect(201);

      const registrado = await prisma.deviceToken.findUnique({
        where: { token: "fcm-token-de-teste-123" },
      });
      expect(registrado?.ativo).toBe(true);

      await request(app.getHttpServer())
        .delete("/v1/notifications/dispositivos/fcm-token-de-teste-123")
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const desativado = await prisma.deviceToken.findUnique({
        where: { token: "fcm-token-de-teste-123" },
      });
      expect(desativado?.ativo).toBe(false);
    });
  });

  describe("Preferências / Quiet Hours", () => {
    it("GET /preferencia retorna defaults quando o usuário nunca configurou", async () => {
      const userId = await createUser({ isResponsavel: true });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const response = await request(app.getHttpServer())
        .get("/v1/notifications/preferencia")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          receberPush: true,
          receberWhatsapp: true,
          receberSms: true,
          receberEmail: true,
          silenciarFinsDeSemana: false,
        }),
      );
    });

    it("PATCH /preferencia atualiza parcialmente e registra auditoria NOTIFICATION_PREFERENCE_UPDATED", async () => {
      const userId = await createUser({ isResponsavel: true });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const response = await request(app.getHttpServer())
        .patch("/v1/notifications/preferencia")
        .set("Authorization", `Bearer ${token}`)
        .send({ receberWhatsapp: false, quietHoursInicio: "22:00", quietHoursFim: "06:00" })
        .expect(200);

      expect(response.body.data.receberWhatsapp).toBe(false);
      expect(response.body.data.quietHoursInicio).toBe("22:00");

      const logs = await prisma.auditLog.findMany({
        where: { entidadeTipo: "Notification", acao: "NOTIFICATION_PREFERENCE_UPDATED" },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.entidadeId).toBe(userId);
      expect(logs[0]?.companyId).toBeNull();
    });

    it("rejeita um horário em formato inválido (400)", async () => {
      const userId = await createUser({ isResponsavel: true });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      await request(app.getHttpServer())
        .patch("/v1/notifications/preferencia")
        .set("Authorization", `Bearer ${token}`)
        .send({ quietHoursInicio: "25:99" })
        .expect(400);
    });
  });

  describe("Dashboard de comunicação (empresa)", () => {
    it("Motorista não pode acessar o dashboard de nenhuma empresa (403)", async () => {
      const company = await createCompany();
      const motoristaId = await createUser();
      await prisma.membership.create({
        data: { userId: motoristaId, companyId: company.id, role: Role.MOTORISTA },
      });
      const token = signTestToken({
        sub: motoristaId,
        tenantId: company.id,
        role: Role.MOTORISTA,
        vinculoId: randomUUID(),
      });

      await request(app.getHttpServer())
        .get(`/v1/notifications/empresas/${company.id}/dashboard`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("Empresa não acessa o dashboard de OUTRA empresa (404, nunca 403)", async () => {
      const company = await createCompany();
      const outraCompany = await createCompany();
      const empresaId = await createUser();
      await prisma.membership.create({
        data: { userId: empresaId, companyId: company.id, role: Role.EMPRESA },
      });
      const token = signTestToken({
        sub: empresaId,
        tenantId: company.id,
        role: Role.EMPRESA,
        vinculoId: randomUUID(),
      });

      await request(app.getHttpServer())
        .get(`/v1/notifications/empresas/${outraCompany.id}/dashboard`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("agrega total/lidas/por prioridade/por tipo/por canal da PRÓPRIA empresa", async () => {
      const company = await createCompany();
      const empresaId = await createUser();
      await prisma.membership.create({
        data: { userId: empresaId, companyId: company.id, role: Role.EMPRESA },
      });
      const token = signTestToken({
        sub: empresaId,
        tenantId: company.id,
        role: Role.EMPRESA,
        vinculoId: randomUUID(),
      });

      const destinatario = await createUser({ isResponsavel: true });
      await createNotification({
        userId: destinatario,
        companyId: company.id,
        tipo: "NOVA_ESCOLA",
        canaisEscolhidos: ["IN_APP", "PUSH"],
      });
      await createNotification({
        userId: destinatario,
        companyId: company.id,
        tipo: "NOVO_CONTRATO",
        lida: true,
        canaisEscolhidos: ["IN_APP"],
      });
      // Notificação de OUTRA empresa nunca deve contaminar a agregação.
      const outraCompany = await createCompany();
      await createNotification({ userId: destinatario, companyId: outraCompany.id });

      const response = await request(app.getHttpServer())
        .get(`/v1/notifications/empresas/${company.id}/dashboard`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.totalEnviadas).toBe(2);
      expect(response.body.data.lidas).toBe(1);
      expect(response.body.data.porTipo).toEqual(
        expect.objectContaining({ NOVA_ESCOLA: 1, NOVO_CONTRATO: 1 }),
      );
      expect(response.body.data.porCanalEscolhido.IN_APP).toBe(2);
      expect(response.body.data.porCanalEscolhido.PUSH).toBe(1);
    });

    it("Admin Rotta acessa o dashboard de qualquer empresa", async () => {
      const company = await createCompany();
      const token = signTestToken({
        sub: adminUserId,
        tenantId: null,
        role: Role.ADMIN_ROTTA,
        vinculoId: adminUserId,
      });

      await request(app.getHttpServer())
        .get(`/v1/notifications/empresas/${company.id}/dashboard`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });
  });

  describe("Trilha de auditoria da empresa", () => {
    it("GET /empresas/:id/audit-logs lista só NOTIFICATION_SENT/NOTIFICATION_CHANNEL_ESCALATED da própria empresa", async () => {
      const company = await createCompany();
      const empresaId = await createUser();
      await prisma.membership.create({
        data: { userId: empresaId, companyId: company.id, role: Role.EMPRESA },
      });
      const token = signTestToken({
        sub: empresaId,
        tenantId: company.id,
        role: Role.EMPRESA,
        vinculoId: randomUUID(),
      });

      await prisma.auditLog.create({
        data: {
          companyId: company.id,
          entidadeTipo: "Notification",
          entidadeId: randomUUID(),
          acao: "NOTIFICATION_SENT",
          dadosDepois: { tipo: "NOVA_ESCOLA" },
        },
      });
      // Log de outra empresa nunca aparece.
      const outraCompany = await createCompany();
      await prisma.auditLog.create({
        data: {
          companyId: outraCompany.id,
          entidadeTipo: "Notification",
          entidadeId: randomUUID(),
          acao: "NOTIFICATION_SENT",
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/v1/notifications/empresas/${company.id}/audit-logs`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.items[0].acao).toBe("NOTIFICATION_SENT");
    });
  });

  describe("carga (concorrência)", () => {
    it("suporta 50 leituras concorrentes do próprio inbox sem erro nem vazamento entre usuários", async () => {
      const userId = await createUser({ isResponsavel: true });
      const outroUserId = await createUser({ isResponsavel: true });
      // Sequencial (nunca Promise.all) — este `prisma` é uma única conexão
      // com `bypass_rls` setado por sessão; concorrência real aqui
      // pegaria outra conexão do pool sem o bypass (mesmo risco descrito
      // em `PrismaService.withTenant`), derrubando a fixture com uma
      // violação de RLS.
      for (let i = 0; i < 5; i += 1) {
        await createNotification({ userId });
      }
      for (let i = 0; i < 5; i += 1) {
        await createNotification({ userId: outroUserId });
      }

      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const respostas = await Promise.all(
        Array.from({ length: 50 }, () =>
          request(app.getHttpServer())
            .get("/v1/notifications")
            .set("Authorization", `Bearer ${token}`),
        ),
      );

      for (const resposta of respostas) {
        expect(resposta.status).toBe(200);
        expect(resposta.body.data.total).toBe(5);
      }
    });

    it("suporta 30 registros de dispositivo concorrentes sem corromper o estado", async () => {
      const userId = await createUser({ isResponsavel: true });
      const token = signTestToken({
        sub: userId,
        tenantId: null,
        role: Role.RESPONSAVEL,
        vinculoId: userId,
      });

      const respostas = await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          request(app.getHttpServer())
            .post("/v1/notifications/dispositivos")
            .set("Authorization", `Bearer ${token}`)
            .send({ token: `carga-token-${i}`, plataforma: "ANDROID" }),
        ),
      );

      for (const resposta of respostas) {
        expect(resposta.status).toBe(201);
      }

      const total = await prisma.deviceToken.count({ where: { userId } });
      expect(total).toBe(30);
    });
  });
});
