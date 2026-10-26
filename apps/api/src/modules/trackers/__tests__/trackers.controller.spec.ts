import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { TrackersController } from "../trackers.controller";
import { TrackersService } from "../trackers.service";

import type { INestApplication } from "@nestjs/common";

/**
 * O endpoint de posições, pela porta de entrada de verdade.
 *
 * ## Por que este teste sobe um servidor HTTP
 *
 * Porque o defeito não estava no serviço nem no DTO: estava no
 * `ValidationPipe` GLOBAL, que roda antes de qualquer código nosso.
 * Com `whitelist` e `forbidNonWhitelisted` (`main.ts`), ele recusava
 * com 400 o corpo real do Traccar por causa da chave `position`, dos
 * campos a mais de `device` e das dezenas de atributos do Teltonika.
 *
 * Um teste que chamasse `controller.registrarPosicao(corpo)` direto
 * passaria com o defeito presente, porque o pipe nunca entraria. Só
 * uma requisição HTTP de verdade, com o MESMO pipe de produção
 * registrado, prova que o corpo chega inteiro.
 *
 * Mora no conjunto de testes normal, e não em `test/*.e2e-spec.ts`, de
 * propósito: não precisa de banco, e assim roda em todo commit. Este é
 * o teste que não pode deixar de rodar.
 */

const SEGREDO = "segredo-de-teste-nunca-real";

/** O corpo real de um FMC130 encaminhado pelo Traccar (`PositionData.java`). */
const ENCAMINHAMENTO_REAL = {
  position: {
    id: 48219,
    deviceId: 7,
    protocol: "teltonika",
    serverTime: "2026-10-26T09:00:12.000+00:00",
    deviceTime: "2026-10-26T09:00:08.000+00:00",
    fixTime: "2026-10-26T09:00:08.000+00:00",
    outdated: false,
    valid: true,
    latitude: -22.9194,
    longitude: -42.8186,
    altitude: 14.2,
    speed: 17.3,
    course: 211,
    accuracy: 0,
    attributes: {
      priority: 0,
      sat: 11,
      event: 0,
      ignition: true,
      motion: true,
      io239: 1,
      power: 12.735,
      distance: 134.55,
      totalDistance: 182733.41,
    },
  },
  device: {
    id: 7,
    name: "01.0867",
    uniqueId: "356938035643809",
    status: "online",
    disabled: false,
    lastUpdate: "2026-10-26T09:00:12.000+00:00",
    positionId: 48219,
    model: "FMC130",
    attributes: {},
  },
};

describe("POST /trackers/posicoes", () => {
  let app: INestApplication;
  let registrarPosicao: jest.Mock;

  beforeAll(async () => {
    registrarPosicao = jest.fn().mockResolvedValue({ aceita: true, motivo: "ok" });

    const moduloDeTeste = await Test.createTestingModule({
      controllers: [TrackersController],
      providers: [
        { provide: TrackersService, useValue: { registrarPosicao } },
        // O `@UseGuards(TrackerIngestGuard)` da rota continua valendo:
        // este teste prova o caminho inteiro, não um controller sem
        // porteiro. O guard só precisa do `ConfigService`.
        {
          provide: ConfigService,
          useValue: { get: () => ({ ingestSecret: SEGREDO, minutosSemSinalParaEncerrar: 20 }) },
        },
      ],
    }).compile();

    app = moduloDeTeste.createNestApplication();
    // EXATAMENTE o pipe de `main.ts`. Afrouxá-lo aqui faria o teste
    // passar sem provar nada.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    registrarPosicao.mockClear();
  });

  it("aceita o corpo aninhado real e entrega ao serviço já achatado", async () => {
    const resposta = await request(app.getHttpServer())
      .post("/trackers/posicoes")
      .set("X-Rotta-Tracker-Token", SEGREDO)
      .send(ENCAMINHAMENTO_REAL);

    expect(resposta.status).toBe(200);
    expect(registrarPosicao).toHaveBeenCalledTimes(1);

    const recebido = registrarPosicao.mock.calls[0]?.[0];
    expect(recebido.device.uniqueId).toBe("356938035643809");
    expect(recebido.latitude).toBe(-22.9194);
    expect(recebido.longitude).toBe(-42.8186);
    expect(recebido.attributes.ignition).toBe(true);
    expect(recebido.fixTime).toBe("2026-10-26T09:00:08.000+00:00");
  });

  it("aceita o formato achatado do `curl` de diagnóstico", async () => {
    const resposta = await request(app.getHttpServer())
      .post("/trackers/posicoes")
      .set("X-Rotta-Tracker-Token", SEGREDO)
      .send({
        device: { uniqueId: "863719060123456" },
        latitude: -22.9194,
        longitude: -42.8186,
        valid: true,
        fixTime: "2026-10-26T11:00:00Z",
        attributes: { ignition: true },
      });

    expect(resposta.status).toBe(200);
    expect(registrarPosicao).toHaveBeenCalledTimes(1);
  });

  it("corpo que a Rotta não entende volta 200, com o motivo, sem chegar ao serviço", async () => {
    // 200 e não 400: o Traccar reentrega o que falha, para sempre. Um
    // 4xx aqui viraria fila infinita de retentativas impossíveis,
    // atrasando as posições dos ônibus corretos.
    const resposta = await request(app.getHttpServer())
      .post("/trackers/posicoes")
      .set("X-Rotta-Tracker-Token", SEGREDO)
      .send({ position: { protocol: "teltonika" }, device: { uniqueId: "356938035643809" } });

    expect(resposta.status).toBe(200);
    expect(resposta.body.aceita).toBe(false);
    expect(resposta.body.motivo).toContain("latitude");
    expect(registrarPosicao).not.toHaveBeenCalled();
  });

  it("posição sem fix válido chega ao serviço, que é quem decide descartar", async () => {
    registrarPosicao.mockResolvedValueOnce({
      aceita: false,
      motivo: "Posição sem fix válido de GPS.",
    });

    const corpo = structuredClone(ENCAMINHAMENTO_REAL);
    corpo.position.valid = false;

    const resposta = await request(app.getHttpServer())
      .post("/trackers/posicoes")
      .set("X-Rotta-Tracker-Token", SEGREDO)
      .send(corpo);

    expect(resposta.status).toBe(200);
    expect(resposta.body.aceita).toBe(false);
    expect(registrarPosicao).toHaveBeenCalledTimes(1);
    expect(registrarPosicao.mock.calls[0]?.[0].valid).toBe(false);
  });

  it("IMEI não credenciado continua sendo decisão do serviço, com 200", async () => {
    registrarPosicao.mockResolvedValueOnce({
      aceita: false,
      motivo: "IMEI não credenciado em nenhum ônibus.",
    });

    const resposta = await request(app.getHttpServer())
      .post("/trackers/posicoes")
      .set("X-Rotta-Tracker-Token", SEGREDO)
      .send(ENCAMINHAMENTO_REAL);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      aceita: false,
      motivo: "IMEI não credenciado em nenhum ônibus.",
    });
  });

  it("sem o cabeçalho do segredo, nada entra", async () => {
    const resposta = await request(app.getHttpServer())
      .post("/trackers/posicoes")
      .send(ENCAMINHAMENTO_REAL);

    expect(resposta.status).toBe(401);
    expect(registrarPosicao).not.toHaveBeenCalled();
  });
});
