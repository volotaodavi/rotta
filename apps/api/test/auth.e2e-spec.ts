import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { AppModule } from "@/app.module";
import { PasswordResetNotifierService } from "@/modules/auth/password-reset-notifier.service";

/**
 * E2E do módulo Auth (Dossiê 15) — sobe a aplicação Nest completa
 * (guards/interceptors/filtros globais reais) contra o Postgres de
 * teste. Cobre o fluxo real de ponta a ponta que o briefing exige: uma
 * única conta compartilhada entre "todas as plataformas" — aqui
 * verificado via HTTP puro (o mesmo contrato consumido por
 * apps/web/apps/admin/apps/mobile), nunca simulado/mockado.
 */
describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let notifySpy: jest.Mock;

  const registerPayload = (overrides: Record<string, unknown> = {}) => ({
    razaoSocial: "Transportes Delta LTDA",
    nomeFantasia: "Delta Transportes",
    cpfCnpj: randomValidCnpj(),
    tipo: "LTDA",
    email: "contato@delta.com.br",
    telefone: randomValidPhone(),
    cep: "01310100",
    endereco: "Avenida Paulista",
    numero: "1000",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    aceiteTermos: true,
    administrador: {
      nome: "Diana Delta",
      email: `diana-${randomUUID()}@delta.com.br`,
      telefone: randomValidPhone(),
      cpf: randomValidCpf(),
      senha: "SenhaForte@123",
    },
    ...overrides,
  });

  beforeAll(async () => {
    notifySpy = jest.fn();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordResetNotifierService)
      .useValue({ notify: notifySpy })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("Registro self-service (AUTH-01)", () => {
    it("cria Company + User + Membership e devolve tokens válidos", async () => {
      const response = await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(registerPayload())
        .expect(201);

      expect(response.body.data.accessToken).toEqual(expect.any(String));
      expect(response.body.data.refreshToken).toEqual(expect.any(String));
      expect(response.body.data.user.role).toBe("empresa");
      expect(response.body.data.user.companyId).toEqual(expect.any(String));
    });

    it("rejeita CNPJ duplicado", async () => {
      const payload = registerPayload();
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send({
          ...payload,
          administrador: { ...payload.administrador, email: `outro-${randomUUID()}@delta.com.br` },
        })
        .expect(409);
    });

    it("rejeita cadastro sem aceite dos termos", async () => {
      const { aceiteTermos: _ignored, ...payload } = registerPayload();
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(400);
    });
  });

  describe("Login único (AUTH-02)", () => {
    it("autentica com e-mail+senha e resolve o vínculo automaticamente (um único Membership)", async () => {
      const payload = registerPayload();
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);

      const login = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ identificador: payload.administrador.email, senha: payload.administrador.senha })
        .expect(200);

      expect(login.body.data.user.email).toBe(payload.administrador.email);
    });

    it("autentica pelo CPF do administrador", async () => {
      const payload = registerPayload();
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);

      await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ identificador: payload.administrador.cpf, senha: payload.administrador.senha })
        .expect(200);
    });

    it("nunca revela se o identificador existe ou não (mesma mensagem genérica)", async () => {
      const payload = registerPayload();
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);

      const wrongPassword = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ identificador: payload.administrador.email, senha: "SenhaErrada@999" })
        .expect(401);

      const unknownUser = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ identificador: `naoexiste-${randomUUID()}@teste.com`, senha: "SenhaErrada@999" })
        .expect(401);

      expect(wrongPassword.body.message).toBe(unknownUser.body.message);
    });
  });

  describe("Sessão (/auth/me, refresh, logout, sessions)", () => {
    it("percorre o ciclo completo: me -> refresh (rotaciona) -> reuso do token antigo falha -> logout", async () => {
      const payload = registerPayload();
      const registered = await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);

      const { accessToken, refreshToken } = registered.body.data as {
        accessToken: string;
        refreshToken: string;
      };

      await request(app.getHttpServer())
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.companyId).toEqual(expect.any(String));
        });

      const refreshed = await request(app.getHttpServer())
        .post("/v1/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      const newRefreshToken = refreshed.body.data.refreshToken as string;
      expect(newRefreshToken).not.toBe(refreshToken);

      // Dossie 12 §4.4: reusar um refresh token já rotacionado é tratado como comprometimento.
      await request(app.getHttpServer())
        .post("/v1/auth/refresh")
        .send({ refreshToken })
        .expect(401);

      // A rotação acima já revogou TODAS as sessões do usuário (reuse detection) —
      // então mesmo o refresh token novo, emitido antes da detecção, não serve mais.
      await request(app.getHttpServer())
        .post("/v1/auth/refresh")
        .send({ refreshToken: newRefreshToken })
        .expect(401);
    });

    it("lista sessões, protege a sessão atual e permite revogar as demais", async () => {
      const payload = registerPayload();
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);

      const loginA = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({
          identificador: payload.administrador.email,
          senha: payload.administrador.senha,
          deviceName: "Device A",
        })
        .expect(200);
      const tokenA = loginA.body.data.accessToken as string;

      await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({
          identificador: payload.administrador.email,
          senha: payload.administrador.senha,
          deviceName: "Device B",
        })
        .expect(200);

      const sessionsBefore = await request(app.getHttpServer())
        .get("/v1/auth/sessions")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(sessionsBefore.body.data.length).toBeGreaterThanOrEqual(2);

      const current = sessionsBefore.body.data.find(
        (s: { isCurrentSession: boolean }) => s.isCurrentSession,
      );
      expect(current).toBeDefined();

      // Nunca pode revogar a própria sessão atual por este endpoint.
      await request(app.getHttpServer())
        .delete(`/v1/auth/sessions/${current.id}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(400);

      await request(app.getHttpServer())
        .delete("/v1/auth/sessions/other")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(204);

      const sessionsAfter = await request(app.getHttpServer())
        .get("/v1/auth/sessions")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(sessionsAfter.body.data).toHaveLength(1);
    });
  });

  describe("Recuperação de senha (AUTH-03)", () => {
    it("mesma resposta genérica exista ou não a conta; token só funciona uma vez e revoga sessões", async () => {
      const payload = registerPayload();
      await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);

      notifySpy.mockClear();
      const known = await request(app.getHttpServer())
        .post("/v1/auth/forgot-password")
        .send({ email: payload.administrador.email })
        .expect(200);
      const unknown = await request(app.getHttpServer())
        .post("/v1/auth/forgot-password")
        .send({ email: `naoexiste-${randomUUID()}@teste.com` })
        .expect(200);
      expect(known.body.data.message).toBe(unknown.body.data.message);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      const [, rawToken] = notifySpy.mock.calls[0] as [string, string];

      await request(app.getHttpServer())
        .post("/v1/auth/reset-password")
        .send({ token: rawToken, novaSenha: "OutraSenhaForte@456" })
        .expect(200);

      await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ identificador: payload.administrador.email, senha: payload.administrador.senha })
        .expect(401);

      await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ identificador: payload.administrador.email, senha: "OutraSenhaForte@456" })
        .expect(200);

      // Token já usado não pode ser reaproveitado.
      await request(app.getHttpServer())
        .post("/v1/auth/reset-password")
        .send({ token: rawToken, novaSenha: "MaisUmaSenha@789" })
        .expect(400);
    });
  });

  describe("Convites (briefing 'Convite de Motoristas')", () => {
    it("cria, pré-visualiza e resgata um convite — o convidado nunca cria uma Company", async () => {
      const payload = registerPayload();
      const registered = await request(app.getHttpServer())
        .post("/v1/auth/register/empresa")
        .send(payload)
        .expect(201);
      const { accessToken, user } = registered.body.data as {
        accessToken: string;
        user: { companyId: string };
      };

      const invite = await request(app.getHttpServer())
        .post(`/v1/companies/${user.companyId}/invites`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ role: "motorista" })
        .expect(201);

      const codigo = invite.body.data.codigo as string;

      const preview = await request(app.getHttpServer())
        .get(`/v1/invites/${codigo}/preview`)
        .expect(200);
      expect(preview.body.data).toEqual({ companyName: payload.nomeFantasia, role: "motorista" });

      const redeemed = await request(app.getHttpServer())
        .post("/v1/invites/redeem")
        .send({
          codigo,
          nome: "João Motorista",
          email: `joao-${randomUUID()}@motorista.com`,
          telefone: randomValidPhone(),
          cpf: randomValidCpf(),
          senha: "SenhaForte@123",
          aceiteTermos: true,
        })
        .expect(201);

      expect(redeemed.body.data.user.role).toBe("motorista");
      expect(redeemed.body.data.user.companyId).toBe(user.companyId);

      // Convite já usado não pode ser resgatado novamente.
      await request(app.getHttpServer())
        .post("/v1/invites/redeem")
        .send({
          codigo,
          nome: "Outro",
          email: `outro-${randomUUID()}@teste.com`,
          telefone: randomValidPhone(),
          cpf: randomValidCpf(),
          senha: "SenhaForte@123",
          aceiteTermos: true,
        })
        .expect(400);
    });

    it("código inexistente retorna 404 na pré-visualização", async () => {
      await request(app.getHttpServer()).get("/v1/invites/XXXXXX/preview").expect(404);
    });
  });
});

function randomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

/** Celular brasileiro válido (`@rotta/validators`: DDD + "9" + 8 dígitos) — DDD fixo, restante aleatório. */
function randomValidPhone(): string {
  return `119${randomDigits(8)}`;
}

/** Gera um CNPJ com dígitos verificadores válidos a partir de uma base aleatória (mesmo algoritmo de `@rotta/validators`). */
function randomValidCnpj(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const dv1 = calcCnpjDigit(base);
  const dv2 = calcCnpjDigit([...base, dv1]);
  return [...base, dv1, dv2].join("");
}

function calcCnpjDigit(nums: number[]): number {
  const weights =
    nums.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = nums.reduce((acc, n, i) => acc + n * weights[i]!, 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

/** Gera um CPF com dígitos verificadores válidos a partir de uma base aleatória (mesmo algoritmo de `@rotta/validators`). */
function randomValidCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv1 = calcCpfDigit(base, 10);
  const dv2 = calcCpfDigit([...base, dv1], 11);
  return [...base, dv1, dv2].join("");
}

function calcCpfDigit(nums: number[], weightStart: number): number {
  let sum = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i]! * (weightStart - i);
  }
  const mod = (sum * 10) % 11;
  return mod === 10 ? 0 : mod;
}
