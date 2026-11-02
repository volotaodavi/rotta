import { renderHook, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

import { BACKGROUND_TRIP_LOCATION_TASK, getActiveTripId } from "../background-trip-location-task";
import { useTripGpsReporting } from "../use-trip-gps-reporting";

/**
 * O rastreamento da viagem, do lado do motorista.
 *
 * ## As duas coisas que este teste protege
 *
 * **A primeira é a loja.** O Google Play exige "Prominent Disclosure &
 * Consent" de todo aplicativo que pede `ACCESS_BACKGROUND_LOCATION`: a
 * explicação em tela ANTES do diálogo do sistema, nunca depois. O
 * aplicativo respeita isso parando num estado próprio
 * (`aguardando-consentimento`) e só disparando o diálogo nativo quando
 * a tela chama `confirmarDivulgacao()`. Se alguém inverter essa ordem
 * num refactor, o aplicativo não quebra — ele é REPROVADO na revisão da
 * Play, e a Rotta descobre isso dias depois, com a publicação parada.
 *
 * **A segunda é o motorista que nega a permissão "sempre".** Negar é
 * comum, e provavelmente é a maioria. O aplicativo não pode deixar de
 * reportar por causa disso: cai para o rastreamento em primeiro plano,
 * que é pior, mas é muito melhor que nada — a família continua vendo o
 * ônibus enquanto a tela está aberta.
 */

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock("@/features/driver/fila-gps/fila-gps", () => ({
  enfileirar: jest.fn().mockResolvedValue(undefined),
  drenar: jest.fn().mockResolvedValue({ enviadas: 0, restantes: 0 }),
}));

const mock = Location as jest.Mocked<typeof Location>;

/** O estado do aparelho: o que cada permissão responde. */
function aparelho(opcoes: {
  primeiroPlano?: "granted" | "denied";
  segundoPlano?: "granted" | "denied";
  /** A permissão "sempre" JÁ estava concedida de uma viagem anterior. */
  segundoPlanoJaConcedido?: boolean;
}): void {
  mock.requestForegroundPermissionsAsync.mockResolvedValue({
    status: opcoes.primeiroPlano ?? "granted",
  } as never);
  mock.requestBackgroundPermissionsAsync.mockResolvedValue({
    status: opcoes.segundoPlano ?? "granted",
  } as never);
  mock.getBackgroundPermissionsAsync.mockResolvedValue({
    status: opcoes.segundoPlanoJaConcedido ? "granted" : "denied",
  } as never);
  mock.hasStartedLocationUpdatesAsync.mockResolvedValue(false);
  mock.startLocationUpdatesAsync.mockResolvedValue(undefined);
  mock.stopLocationUpdatesAsync.mockResolvedValue(undefined);
  mock.watchPositionAsync.mockResolvedValue({ remove: jest.fn() } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  aparelho({});
});

describe("sem viagem, o GPS fica desligado", () => {
  it("não pede permissão nenhuma", async () => {
    // "Nunca deixar o GPS ativo desnecessariamente" não é só economia de
    // bateria: é a diferença entre rastrear uma viagem e rastrear uma
    // pessoa.
    const { result } = renderHook(() => useTripGpsReporting(null));

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(mock.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe("a divulgação que o Google Play exige", () => {
  it("para e espera a tela explicar, ANTES do diálogo do sistema", async () => {
    const { result } = renderHook(() => useTripGpsReporting("viagem-1"));

    await waitFor(() => expect(result.current.status).toBe("aguardando-consentimento"));
    // O ponto inteiro: o diálogo nativo de segundo plano NÃO foi
    // disparado. Disparar antes da explicação é reprovação na revisão.
    expect(mock.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mock.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it("depois de confirmada, aí sim pede ao sistema e começa a rastrear", async () => {
    const { result } = renderHook(() => useTripGpsReporting("viagem-1"));
    await waitFor(() => expect(result.current.status).toBe("aguardando-consentimento"));

    result.current.confirmarDivulgacao();

    await waitFor(() => expect(result.current.status).toBe("reporting"));
    expect(mock.requestBackgroundPermissionsAsync).toHaveBeenCalled();
    expect(mock.startLocationUpdatesAsync).toHaveBeenCalledWith(
      BACKGROUND_TRIP_LOCATION_TASK,
      expect.objectContaining({ foregroundService: expect.any(Object) }),
    );
  });

  it("quem já concedeu numa viagem anterior não vê a explicação de novo", async () => {
    // Repetir a tela a cada viagem transformaria a divulgação em
    // obstáculo diário — e ela existe para informar uma vez, não para
    // atrapalhar sempre.
    aparelho({ segundoPlanoJaConcedido: true });

    const { result } = renderHook(() => useTripGpsReporting("viagem-1"));

    await waitFor(() => expect(result.current.status).toBe("reporting"));
  });
});

describe("quando a permissão é negada", () => {
  it("sem permissão de localização, o estado diz isso — não fica girando", async () => {
    aparelho({ primeiroPlano: "denied" });

    const { result } = renderHook(() => useTripGpsReporting("viagem-1"));

    await waitFor(() => expect(result.current.status).toBe("denied"));
    expect(mock.watchPositionAsync).not.toHaveBeenCalled();
  });

  it("negando só o 'sempre', continua reportando em primeiro plano", async () => {
    // Este é o caminho da maioria. Deixar de reportar aqui seria apagar
    // o ônibus do mapa da família de quem só clicou "enquanto usa o
    // app".
    aparelho({ segundoPlanoJaConcedido: true, segundoPlano: "denied" });

    const { result } = renderHook(() => useTripGpsReporting("viagem-1"));

    await waitFor(() => expect(result.current.status).toBe("reporting-foreground-only"));
    expect(mock.watchPositionAsync).toHaveBeenCalled();
    expect(mock.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});

describe("a viagem ativa", () => {
  it("fica registrada enquanto rastreia, para a task saber de quem é a posição", async () => {
    aparelho({ segundoPlanoJaConcedido: true });

    const { result } = renderHook(() => useTripGpsReporting("viagem-42"));

    await waitFor(() => expect(result.current.status).toBe("reporting"));
    expect(getActiveTripId()).toBe("viagem-42");
  });

  it("é zerada ao desmontar, e o rastreamento do sistema é desligado", async () => {
    // Sem isto, o serviço em primeiro plano continuaria com a
    // notificação persistente no aparelho depois de a viagem acabar —
    // e, pior, o SO entregaria posições de uma viagem encerrada.
    aparelho({ segundoPlanoJaConcedido: true });
    mock.hasStartedLocationUpdatesAsync.mockResolvedValue(true);

    const { result, unmount } = renderHook(() => useTripGpsReporting("viagem-42"));
    await waitFor(() => expect(result.current.status).toBe("reporting"));

    unmount();

    await waitFor(() => expect(getActiveTripId()).toBeNull());
    await waitFor(() =>
      expect(mock.stopLocationUpdatesAsync).toHaveBeenCalledWith(BACKGROUND_TRIP_LOCATION_TASK),
    );
  });
});
