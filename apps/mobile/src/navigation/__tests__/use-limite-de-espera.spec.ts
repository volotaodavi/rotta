import { act, renderHook } from "@testing-library/react-native";

import { LIMITE_DE_ESPERA_DA_SPLASH_MS, useLimiteDeEspera } from "../use-limite-de-espera";

/**
 * O bug que estes testes impedem de voltar (18/09/2026): o app ficava
 * preso na splash — "tela azul escrito Rotta" — quando a API estava em
 * cold start, porque o `RootNavigator` esperava sem limite pela consulta
 * de verificação de identidade.
 */
describe("useLimiteDeEspera", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("não estoura enquanto o limite não passa", () => {
    const { result } = renderHook(() => useLimiteDeEspera(true, LIMITE_DE_ESPERA_DA_SPLASH_MS));

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(LIMITE_DE_ESPERA_DA_SPLASH_MS - 1);
    });
    expect(result.current).toBe(false);
  });

  it("estoura quando o limite passa — é isto que solta a splash", () => {
    const { result } = renderHook(() => useLimiteDeEspera(true, LIMITE_DE_ESPERA_DA_SPLASH_MS));

    act(() => {
      jest.advanceTimersByTime(LIMITE_DE_ESPERA_DA_SPLASH_MS);
    });

    expect(result.current).toBe(true);
  });

  it("nunca estoura quando não se está esperando", () => {
    const { result } = renderHook(() => useLimiteDeEspera(false, LIMITE_DE_ESPERA_DA_SPLASH_MS));

    act(() => {
      jest.advanceTimersByTime(LIMITE_DE_ESPERA_DA_SPLASH_MS * 10);
    });

    expect(result.current).toBe(false);
  });

  it("reinicia a contagem quando a espera termina e recomeça", () => {
    // Sem isto, uma segunda espera (outro login, um refetch) já nasceria
    // estourada e o portão de identidade nunca mais seguraria nada.
    const { result, rerender } = renderHook(
      ({ esperando }) => useLimiteDeEspera(esperando, LIMITE_DE_ESPERA_DA_SPLASH_MS),
      { initialProps: { esperando: true } },
    );

    act(() => {
      jest.advanceTimersByTime(LIMITE_DE_ESPERA_DA_SPLASH_MS);
    });
    expect(result.current).toBe(true);

    // A resposta chegou: para de esperar.
    rerender({ esperando: false });
    expect(result.current).toBe(false);

    // Espera de novo: volta a contar do zero.
    rerender({ esperando: true });
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(LIMITE_DE_ESPERA_DA_SPLASH_MS - 1);
    });
    expect(result.current).toBe(false);
  });

  it("o limite é generoso para resposta saudável e curto para o usuário", () => {
    // A API responde em ~0,5s acordada; 8s dá folga de mais de 10x sem
    // deixar ninguém olhando tela parada por meio minuto.
    expect(LIMITE_DE_ESPERA_DA_SPLASH_MS).toBeGreaterThanOrEqual(5_000);
    expect(LIMITE_DE_ESPERA_DA_SPLASH_MS).toBeLessThanOrEqual(15_000);
  });
});
