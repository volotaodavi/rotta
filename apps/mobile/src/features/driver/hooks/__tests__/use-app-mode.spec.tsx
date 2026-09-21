import { renderHook, waitFor } from "@testing-library/react-native";

import { useAppMode } from "../use-app-mode";

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
