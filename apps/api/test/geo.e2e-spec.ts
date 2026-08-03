import { randomUUID } from "node:crypto";

import { getQueueToken } from "@nestjs/bullmq";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import type {
  Coordenada,
  GeocodeResult,
  ReverseGeocodeResult,
} from "@/modules/geo/geo-engine.types";
import type { Queue } from "bullmq";

import { AppModule } from "@/app.module";
import { GeoEngineService } from "@/modules/geo/geo-engine.service";
import { INEP_SYNC_QUEUE } from "@/modules/geo/geo.constants";
import { Role } from "@/shared/enums";

/**
 * E2E do Rotta Geo Platform: geocodificação (Geocoding + Validation AI
 * Agent), Fila de Revisão Manual e Map Intelligence Agent, ponta a
 * ponta contra o Postgres/PostGIS de teste real (aplicação Nest
 * completa, RBAC real). `GeoEngineService` é substituído por um dublê
 * controlável (mesma disciplina de `auth.e2e-spec.ts` mockando
 * `PasswordResetNotifierService`) — nunca chama o Mapbox de verdade em
 * E2E, e permite forçar deterministicamente os cenários "aprovado na
 * 1ª tentativa" e "cai na revisão manual após 3 tentativas".
 */
describe("Geo Platform (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let empresaToken: string;
  let motoristaToken: string;
  let redis: Redis;
  const adminUserId = randomUUID();

  const geocodeMock = jest.fn<Promise<GeocodeResult>, [string]>();
  const reverseGeocodeMock = jest.fn<Promise<ReverseGeocodeResult>, [Coordenada]>();
  const fakeGeoEngine: Partial<GeoEngineService> = {
    geocode: (endereco) => geocodeMock(endereco),
    reverseGeocode: (ponto) => reverseGeocodeMock(ponto),
    getRoute: jest.fn(),
  };

  async function createSchool(overrides: Record<string, unknown> = {}) {
    return prisma.school.create({
      data: {
        codigoInterno: `ESC-E2E-${randomUUID().slice(0, 8)}`,
        nomeOficial: "EMEF Professora Ana Souza",
        dependenciaAdministrativa: "MUNICIPAL",
        cep: "01310-100",
        logradouro: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        tipos: ["FUNDAMENTAL"],
        turnosAtendidos: ["MANHA"],
        ...overrides,
      },
    });
  }

  function mockAprovadoNaPrimeiraTentativa() {
    geocodeMock.mockResolvedValue({
      latitude: -23.561684,
      longitude: -46.655981,
      precisao: "0.95",
      enderecoFormatado: "Avenida Paulista, 1000, São Paulo - SP",
      logradouro: "Avenida Paulista",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
    });
    reverseGeocodeMock.mockResolvedValue({
      cidade: "São Paulo",
      estado: "SP",
      enderecoFormatado: "Avenida Paulista, 1000, São Paulo - SP",
    });
  }

  function mockSempreReprovado() {
    geocodeMock.mockResolvedValue({
      latitude: -22.9,
      longitude: -43.2,
      precisao: "0.9",
      enderecoFormatado: "Endereço em outra cidade",
      logradouro: null,
      bairro: null,
      cidade: "Rio de Janeiro",
      estado: "RJ",
    });
    reverseGeocodeMock.mockResolvedValue({
      cidade: "Rio de Janeiro",
      estado: "RJ",
      enderecoFormatado: "Endereço em outra cidade",
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GeoEngineService)
      .useValue(fakeGeoEngine)
      .compile();
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
    empresaToken = signTestToken({
      sub: randomUUID(),
      tenantId: randomUUID(),
      role: Role.EMPRESA,
      vinculoId: randomUUID(),
    });
    motoristaToken = signTestToken({
      sub: randomUUID(),
      tenantId: randomUUID(),
      role: Role.MOTORISTA,
      vinculoId: randomUUID(),
    });

    // Cliente Redis à parte para limpar o cache do Map Intelligence Agent
    // entre testes — `MapIntelligenceService` cacheia por bounding
    // box/coordenada (nunca por schoolId), então sem isso um teste
    // anterior "vaza" um resultado em cache para o mesmo bounding box
    // usado por outro teste, mesmo com a Escola já deletada.
    redis = new Redis(process.env.REDIS_URL!);
  });

  afterAll(async () => {
    // Nunca `user.deleteMany` aqui: `empresaToken`/`motoristaToken` são
    // JWTs autocontidos, sem `User` persistido (RBAC de Geo decide só
    // pelas claims do token, nenhuma consulta a `users`) — um
    // `deleteMany` amplo colidiria com usuários de OUTROS specs E2E
    // rodando em paralelo contra o mesmo banco de teste (FK de
    // `invites.criadoPorId`), como em schools.e2e-spec.ts.
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.schoolCoordinate.deleteMany();
    await prisma.school.deleteMany();
    await prisma.user.delete({ where: { id: adminUserId } });
    await prisma.$disconnect();
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    geocodeMock.mockReset();
    await redis.flushdb();
    reverseGeocodeMock.mockReset();
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.schoolCoordinate.deleteMany();
    await prisma.school.deleteMany();
  });

  describe("POST /v1/geo/schools/:id/geocode", () => {
    it("rejeita Motorista (403) e requisição sem token (401)", async () => {
      const school = await createSchool();
      await request(app.getHttpServer()).post(`/v1/geo/schools/${school.id}/geocode`).expect(401);
      await request(app.getHttpServer())
        .post(`/v1/geo/schools/${school.id}/geocode`)
        .set("Authorization", `Bearer ${motoristaToken}`)
        .expect(403);
    });

    it("aprova na 1ª tentativa (Geocoding + Validation AI Agent) e grava lat/lng na Escola", async () => {
      mockAprovadoNaPrimeiraTentativa();
      const school = await createSchool();

      const response = await request(app.getHttpServer())
        .post(`/v1/geo/schools/${school.id}/geocode`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(201);

      expect(response.body.data.status).toBe("VALIDADO");
      expect(response.body.data.validadoPorIa).toBe(true);
      expect(geocodeMock).toHaveBeenCalledTimes(1);

      const escolaAtualizada = await prisma.school.findUniqueOrThrow({ where: { id: school.id } });
      expect(Number(escolaAtualizada.latitude)).toBeCloseTo(-23.561684, 5);
      expect(Number(escolaAtualizada.longitude)).toBeCloseTo(-46.655981, 5);
    });

    it("reprova 3x (cidade não confere) e cai na Fila de Revisão Manual, sem loop infinito", async () => {
      mockSempreReprovado();
      const school = await createSchool();

      const response = await request(app.getHttpServer())
        .post(`/v1/geo/schools/${school.id}/geocode`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(201);

      expect(response.body.data.status).toBe("REVISAO_MANUAL");
      expect(response.body.data.tentativa).toBe(3);
      expect(geocodeMock).toHaveBeenCalledTimes(3);

      const fila = await request(app.getHttpServer())
        .get("/v1/geo/revisao-manual")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(fila.body.data.some((item: { id: string }) => item.id === response.body.data.id)).toBe(
        true,
      );
    });

    it("resolve manualmente uma coordenada da Fila de Revisão Manual", async () => {
      mockSempreReprovado();
      const school = await createSchool();
      const geocodeResponse = await request(app.getHttpServer())
        .post(`/v1/geo/schools/${school.id}/geocode`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(201);

      const revisado = await request(app.getHttpServer())
        .patch(`/v1/geo/coordinates/${geocodeResponse.body.data.id}/revisar`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .send({ latitude: -23.55052, longitude: -46.633309 })
        .expect(200);

      expect(revisado.body.data.status).toBe("VALIDADO");
      expect(revisado.body.data.fonte).toBe("MANUAL");

      const escolaAtualizada = await prisma.school.findUniqueOrThrow({ where: { id: school.id } });
      expect(Number(escolaAtualizada.latitude)).toBeCloseTo(-23.55052, 5);
      expect(Number(escolaAtualizada.longitude)).toBeCloseTo(-46.633309, 5);
    });
  });

  describe("Map Intelligence Agent (GET /v1/geo/mapa/*)", () => {
    it("responsável/motorista podem ver marcadores, mas não disparar geocodificação", async () => {
      await request(app.getHttpServer())
        .get("/v1/geo/mapa/marcadores")
        .query({ swLat: -24, swLng: -47, neLat: -23, neLng: -46 })
        .set("Authorization", `Bearer ${motoristaToken}`)
        .expect(200);
    });

    it("retorna a escola dentro da bounding box e não a retorna fora dela (índice espacial GiST)", async () => {
      mockAprovadoNaPrimeiraTentativa();
      const school = await createSchool();
      await request(app.getHttpServer())
        .post(`/v1/geo/schools/${school.id}/geocode`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(201);

      const dentro = await request(app.getHttpServer())
        .get("/v1/geo/mapa/marcadores")
        .query({ swLat: -23.6, swLng: -46.7, neLat: -23.5, neLng: -46.6 })
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(dentro.body.data.some((marker: { id: string }) => marker.id === school.id)).toBe(true);

      const fora = await request(app.getHttpServer())
        .get("/v1/geo/mapa/marcadores")
        .query({ swLat: 1, swLng: 1, neLat: 2, neLng: 2 })
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      expect(fora.body.data.some((marker: { id: string }) => marker.id === school.id)).toBe(false);
    });

    it("retorna as escolas mais próximas de um ponto dentro do raio informado", async () => {
      mockAprovadoNaPrimeiraTentativa();
      const school = await createSchool();
      await request(app.getHttpServer())
        .post(`/v1/geo/schools/${school.id}/geocode`)
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(201);

      const proximas = await request(app.getHttpServer())
        .get("/v1/geo/mapa/proximas")
        .query({ lat: -23.561684, lng: -46.655981, raioKm: 1 })
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(200);
      const encontrada = proximas.body.data.find(
        (marker: { id: string }) => marker.id === school.id,
      );
      expect(encontrada).toBeDefined();
      expect(encontrada.distanciaMetros).toBeLessThan(50);
    });
  });

  describe("POST /v1/geo/inep-sync", () => {
    it("só Admin Rotta pode disparar a sincronização INEP", async () => {
      await request(app.getHttpServer())
        .post("/v1/geo/inep-sync")
        .query({ ano: 2024 })
        .set("Authorization", `Bearer ${empresaToken}`)
        .expect(403);
    });

    it("Admin Rotta enfileira a sincronização (202 Accepted) e o job cai de verdade na fila BullMQ", async () => {
      const inepSyncQueue = app.get<Queue>(getQueueToken(INEP_SYNC_QUEUE));

      const response = await request(app.getHttpServer())
        .post("/v1/geo/inep-sync")
        .query({ ano: 2024 })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(202);

      expect(response.body.data).toMatchObject({ ano: 2024 });
      expect(response.body.data.jobId).toBeTruthy();

      // Não remove o job: o `InepSyncProcessor` real (registrado no mesmo
      // app, Redis real) já pode ter pego a lock para processá-lo — a
      // prova que importa aqui é que o job existe na fila com os dados
      // corretos, não o ciclo de vida completo dele (download real do
      // INEP está fora do escopo deste teste e é bloqueado pela rede do
      // ambiente de desenvolvimento).
      const job = await inepSyncQueue.getJob(response.body.data.jobId);
      expect(job).toBeDefined();
      expect(job?.data).toEqual({ ano: 2024 });
    });
  });
});
