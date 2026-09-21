import { renderHook, waitFor } from "@testing-library/react-native";

import { CHAVE_VALIDA_NO_COFRE, chaveDoModo, useAppMode } from "../use-app-mode";

import type { MeResponse } from "@rotta/api-client";

/**
 * INCIDENTE 21/09/2026 — "a conta do transportador não está entrando
 * (nenhuma), fica na tela azul escrito ROTTA".
 *
 * `RootNavigator` mostra a splash enquanto `canToggle &&
 * !isModeResolved`. Este hook era a única coisa capaz de virar
 * `isModeResolved`, e a leitura do cofre estava sem proteção: um throw
 * do `SecureStore` (acontece de verdade no Android — ver
 * `lib/cofre-seguro.ts`) prendia o app na splash PARA SEMPRE.
 *
 * `canToggle` é verdadeiro exatamente para `role === "empresa"` com
 * `companyType` AUTONOMO/MEI. Era por isso que "nenhuma" conta de
 * transportador entrava enquanto a do Responsável entrava normal.
 */

const mockLer = jest.fn();
const mockGravar = jest.fn();

jest.mock("@/lib/cofre-seguro", () => ({
  lerDoCofre: (...args: unknown[]) => mockLer(...args),
  gravarNoCofre: (...args: unknown[]) => mockGravar(...args),
}));

const transportador = {
  id: "user-1",
  role: "empresa",
  companyType: "MEI",
} as unknown as MeResponse;

const responsavel = { id: "user-2", role: "responsavel" } as unknown as MeResponse;

beforeEach(() => {
  mockLer.mockReset().mockResolvedValue(null);
  mockGravar.mockReset().mockResolvedValue(true);
});

it("resolve o modo quando o cofre responde normalmente", async () => {
  mockLer.mockResolvedValue("acao");

  const { result } = renderHook(() => useAppMode(transportador));

  await waitFor(() => expect(result.current.isModeResolved).toBe(true));
  expect(result.current.mode).toBe("acao");
});

it("RESOLVE MESMO ASSIM quando a leitura do cofre falha", async () => {
  // O caso do incidente. Antes, isto deixava `isModeResolved` em
  // `false` para sempre — splash azul permanente para o transportador.
  mockLer.mockRejectedValue(new Error("Could not decrypt the item in SecureStore"));

  const { result } = renderHook(() => useAppMode(transportador));

  await waitFor(() => expect(result.current.isModeResolved).toBe(true));
  // Sem preferência legível, abre na Visão completa — que é uma tela,
  // não um logo parado.
  expect(result.current.mode).toBe("completo");
});

it("resolve para quem nem pode alternar (Responsável)", async () => {
  const { result } = renderHook(() => useAppMode(responsavel));

  await waitFor(() => expect(result.current.isModeResolved).toBe(true));
  expect(result.current.canToggle).toBe(false);
  expect(mockLer).not.toHaveBeenCalled();
});

it("resolve sem usuário (sessão ainda não carregada)", async () => {
  const { result } = renderHook(() => useAppMode(null));

  await waitFor(() => expect(result.current.isModeResolved).toBe(true));
});

it("valor guardado inválido não trava nem vira modo inventado", async () => {
  mockLer.mockResolvedValue("lixo-corrompido");

  const { result } = renderHook(() => useAppMode(transportador));

  await waitFor(() => expect(result.current.isModeResolved).toBe(true));
  expect(result.current.mode).toBe("completo");
});

/**
 * CAUSA RAIZ do incidente de 21/09/2026.
 *
 * A chave era `rotta_app_mode:${userId}`, com dois-pontos. O
 * `expo-secure-store` valida a chave ANTES de qualquer acesso e lança
 * quando ela não casa com `/^[\w.-]+$/`. Não era aparelho ruim nem dado
 * corrompido: era toda leitura, em todo aparelho, para todo usuário,
 * sempre. E o travamento caía só no transportador, porque só ele faz
 * `RootNavigator` esperar por `isModeResolved`.
 */
describe("chave do cofre", () => {
  it("é aceita pelo expo-secure-store", () => {
    // Mesma expressão que o `isValidKey` do pacote usa.
    expect(chaveDoModo("9f8c1d2e-aaaa-4bbb-8ccc-1234567890ab")).toMatch(CHAVE_VALIDA_NO_COFRE);
  });

  it("a chave ANTIGA seria recusada — é isto que travava o app", () => {
    expect("rotta_app_mode:9f8c1d2e-aaaa-4bbb-8ccc-1234567890ab").not.toMatch(
      CHAVE_VALIDA_NO_COFRE,
    );
  });

  it("continua válida para qualquer formato de id", () => {
    for (const id of ["1", "abc", "a-b-c", "A1B2C3", "9f8c1d2e-aaaa-4bbb-8ccc-1234567890ab"]) {
      expect(chaveDoModo(id)).toMatch(CHAVE_VALIDA_NO_COFRE);
    }
  });
});

/**
 * O PISCAR — relato de 21/09/2026: "ROTTA, com o logotipo + tela azul e
 * fica piscando toda hora. NÃO CARREGA."
 *
 * O efeito fazia `setIsModeResolved(false)` em TODA execução, e ele roda
 * de novo sempre que `canToggle` oscila — o que acontece porque o objeto
 * do usuário é reemitido a cada renovação de sessão. Enquanto o
 * `RootNavigator` usava esse estado para segurar a splash, cada
 * oscilação devolvia o app para a tela azul e tirava de novo: o laço.
 *
 * O conserto estrutural é o `RootNavigator` não olhar mais para
 * `isModeResolved`. Este teste guarda a segunda defesa: reprocessar a
 * MESMA sessão não pode desfazer o que já estava resolvido.
 */
describe("não volta a 'não resolvido' na mesma sessão", () => {
  it("mantém resolvido quando o objeto do usuário é reemitido", async () => {
    const { result, rerender } = renderHook(({ u }) => useAppMode(u), {
      initialProps: { u: transportador },
    });

    await waitFor(() => expect(result.current.isModeResolved).toBe(true));

    // Mesma pessoa, objeto novo — exatamente o que a renovação de
    // sessão produz.
    rerender({ u: { ...transportador } as MeResponse });
    expect(result.current.isModeResolved).toBe(true);

    // E de novo, com `companyType` oscilando (o que faz `canToggle`
    // oscilar e era o gatilho do laço).
    rerender({ u: { ...transportador, companyType: undefined } as unknown as MeResponse });
    expect(result.current.isModeResolved).toBe(true);
  });

  it("volta a resolver do zero quando troca de usuário de verdade", async () => {
    const { result, rerender } = renderHook(({ u }) => useAppMode(u), {
      initialProps: { u: transportador },
    });
    await waitFor(() => expect(result.current.isModeResolved).toBe(true));

    rerender({ u: { ...transportador, id: "outro-usuario" } as MeResponse });

    // Outra conta tem outra preferência — aqui reiniciar é o certo.
    await waitFor(() => expect(result.current.isModeResolved).toBe(true));
    expect(mockLer).toHaveBeenLastCalledWith(chaveDoModo("outro-usuario"));
  });
});
