import { lerEncaminhamentoTraccar } from "../traccar-forward.util";

/**
 * A leitura do que o Traccar encaminha.
 *
 * ## O defeito que estes testes travam
 *
 * A API recusava, com 400, **100% das posições de rastreador de
 * verdade**. O DTO esperava `latitude`/`longitude`/`attributes` no topo
 * do corpo, e com `forward.type=json` o Traccar manda a posição dentro
 * de `position`, com o aparelho ao lado em `device`
 * (`PositionData.java`). Somado ao `ValidationPipe` global com
 * `forbidNonWhitelisted`, qualquer um dos três bastava para derrubar:
 * a chave `position`, os campos a mais de `device`, e as dezenas de
 * atributos do Teltonika.
 *
 * O `curl` do README passava porque era um JSON achatado escrito à mão.
 * Nenhum aparelho produz aquilo. Por isso o primeiro teste aqui usa o
 * corpo aninhado inteiro, com os campos que ninguém usa, em vez de uma
 * versão limpa.
 */

/**
 * O corpo real de um FMC130, como o Traccar o encaminha: tudo que ele
 * manda, inclusive o que a Rotta não lê. Se um dia alguém "limpar"
 * este objeto, o teste para de testar o que importa.
 */
function encaminhamentoReal(sobrescritas: Record<string, unknown> = {}) {
  return {
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
      address: null,
      accuracy: 0,
      network: null,
      geofenceIds: null,
      attributes: {
        priority: 0,
        sat: 11,
        event: 0,
        ignition: true,
        motion: true,
        rssi: 4,
        io239: 1,
        io240: 1,
        power: 12.735,
        battery: 4.012,
        distance: 134.55,
        totalDistance: 182733.41,
        hours: 7261000,
      },
      ...sobrescritas,
    },
    device: {
      id: 7,
      name: "01.0867",
      uniqueId: "356938035643809",
      status: "online",
      disabled: false,
      lastUpdate: "2026-10-26T09:00:12.000+00:00",
      positionId: 48219,
      groupId: 0,
      phone: null,
      model: "FMC130",
      contact: null,
      category: null,
      attributes: {},
    },
  };
}

describe("o corpo aninhado real do Traccar", () => {
  it("é aceito inteiro, com os campos que a Rotta não lê descartados em silêncio", () => {
    const leitura = lerEncaminhamentoTraccar(encaminhamentoReal());

    expect(leitura.aceita).toBe(true);
    if (!leitura.aceita) return;

    expect(leitura.payload.device.uniqueId).toBe("356938035643809");
    expect(leitura.payload.latitude).toBe(-22.9194);
    expect(leitura.payload.longitude).toBe(-42.8186);
    expect(leitura.payload.attributes?.ignition).toBe(true);
    expect(leitura.payload.fixTime).toBe("2026-10-26T09:00:08.000+00:00");
    expect(leitura.payload.valid).toBe(true);
  });

  it("descarta os atributos do Teltonika que não entram no contrato", () => {
    const leitura = lerEncaminhamentoTraccar(encaminhamentoReal());

    expect(leitura.aceita).toBe(true);
    if (!leitura.aceita) return;

    // `sat`, `power`, `io239`, `distance` e companhia somem. Eles não
    // podem chegar ao serviço nem fazer a posição ser recusada: o
    // Traccar acrescenta atributo a cada versão, sem avisar ninguém.
    const atributos = leitura.payload.attributes as unknown as Record<string, unknown>;
    for (const ruido of ["sat", "power", "io239", "io240", "distance", "totalDistance", "hours"]) {
      expect(atributos[ruido]).toBeUndefined();
    }
    // E o que a Rotta lê continua lá, com valor.
    expect(atributos.ignition).toBe(true);
    expect(atributos.motion).toBe(true);
  });

  it("ignição desligada atravessa como false, e não some no caminho", () => {
    // É este valor que encerra a viagem do dia. Perdê-lo deixaria o
    // ônibus "em viagem" a noite inteira no app do responsável.
    const corpo = encaminhamentoReal();
    corpo.position.attributes.ignition = false;
    corpo.position.attributes.motion = false;

    const leitura = lerEncaminhamentoTraccar(corpo);

    expect(leitura.aceita).toBe(true);
    if (!leitura.aceita) return;
    expect(leitura.payload.attributes?.ignition).toBe(false);
  });

  it("aparelho que não reporta ignição vira ausência, nunca `desligado`", () => {
    const corpo = encaminhamentoReal();
    corpo.position.attributes = { sat: 9, power: 12.1 } as never;

    const leitura = lerEncaminhamentoTraccar(corpo);

    expect(leitura.aceita).toBe(true);
    if (!leitura.aceita) return;
    expect(leitura.payload.attributes).toBeUndefined();
  });

  it("ignição em texto, como alguns protocolos mandam, não custa a posição", () => {
    const corpo = encaminhamentoReal();
    corpo.position.attributes.ignition = "true" as never;

    const leitura = lerEncaminhamentoTraccar(corpo);

    expect(leitura.aceita).toBe(true);
    if (!leitura.aceita) return;
    expect(leitura.payload.attributes?.ignition).toBe(true);
  });
});

describe("o formato achatado", () => {
  it("continua aceito: é o `curl` de diagnóstico que se usa em campo", () => {
    const leitura = lerEncaminhamentoTraccar({
      device: { uniqueId: "863719060123456" },
      latitude: -22.9194,
      longitude: -42.8186,
      valid: true,
      fixTime: "2026-10-26T11:00:00Z",
      attributes: { ignition: true },
    });

    expect(leitura.aceita).toBe(true);
    if (!leitura.aceita) return;
    expect(leitura.payload.device.uniqueId).toBe("863719060123456");
    expect(leitura.payload.attributes?.ignition).toBe(true);
  });
});

describe("o que não dá para aceitar", () => {
  it("corpo sem coordenada é recusado, com o motivo nomeando o campo", () => {
    const corpo = encaminhamentoReal();
    delete (corpo.position as Record<string, unknown>).latitude;

    const leitura = lerEncaminhamentoTraccar(corpo);

    expect(leitura.aceita).toBe(false);
    if (leitura.aceita) return;
    expect(leitura.motivo).toContain("latitude");
  });

  it("corpo sem device é recusado: sem IMEI não há ônibus", () => {
    const leitura = lerEncaminhamentoTraccar({ position: encaminhamentoReal().position });

    expect(leitura.aceita).toBe(false);
    if (leitura.aceita) return;
    expect(leitura.motivo).toContain("device");
  });

  it("o que não é objeto é recusado sem lançar", () => {
    for (const corpo of [null, undefined, "texto", 42, []]) {
      const leitura = lerEncaminhamentoTraccar(corpo);
      expect(leitura.aceita).toBe(false);
    }
  });

  it("o motivo nunca carrega o IMEI nem a coordenada", () => {
    // Log de recusa vai parar em arquivo e em serviço de observação. O
    // IMEI e a posição de um ônibus escolar não entram nisso.
    const corpo = encaminhamentoReal();
    delete (corpo.position as Record<string, unknown>).latitude;

    const leitura = lerEncaminhamentoTraccar(corpo);

    expect(leitura.aceita).toBe(false);
    if (leitura.aceita) return;
    expect(leitura.motivo).not.toContain("356938035643809");
    expect(leitura.motivo).not.toContain("-42.8186");
  });
});

describe("posição sem fix válido", () => {
  it("atravessa a leitura para o serviço decidir, em vez de ser recusada aqui", () => {
    // `valid: false` NÃO é erro de formato: o corpo está perfeito, o
    // aparelho é que não sabe onde está. Quem descarta é
    // `TrackersService.registrarPosicao`, que é onde a regra mora.
    const corpo = encaminhamentoReal();
    corpo.position.valid = false;

    const leitura = lerEncaminhamentoTraccar(corpo);

    expect(leitura.aceita).toBe(true);
    if (!leitura.aceita) return;
    expect(leitura.payload.valid).toBe(false);
  });
});
