import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAppMode } from "./use-app-mode";

import type { MeResponse } from "@rotta/api-client";

function buildUser(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: "user-1",
    nome: "Zé Motorista",
    email: "ze@example.com",
    telefone: "11999998888",
    avatarUrl: null,
    role: "empresa",
    companyId: "company-1",
    companyName: "Zé Transportes MEI",
    companyType: "MEI",
    pendingConsents: [],
    ...overrides,
  };
}

describe("useAppMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("canToggle é false para usuário null", () => {
    const { result } = renderHook(() => useAppMode(null));
    expect(result.current.canToggle).toBe(false);
    expect(result.current.mode).toBe("completo");
  });

  it("canToggle é false para role empresa com companyType LTDA (empresa normal)", () => {
    const { result } = renderHook(() => useAppMode(buildUser({ companyType: "LTDA" })));
    expect(result.current.canToggle).toBe(false);
  });

  it("canToggle é false para role motorista/monitor de empresa (mesmo com companyType AUTONOMO por engano)", () => {
    const { result } = renderHook(() =>
      useAppMode(buildUser({ role: "motorista", companyType: "AUTONOMO" })),
    );
    expect(result.current.canToggle).toBe(false);
  });

  it("canToggle é true para role empresa com companyType AUTONOMO", () => {
    const { result } = renderHook(() => useAppMode(buildUser({ companyType: "AUTONOMO" })));
    expect(result.current.canToggle).toBe(true);
  });

  it("canToggle é true para role empresa com companyType MEI", () => {
    const { result } = renderHook(() => useAppMode(buildUser({ companyType: "MEI" })));
    expect(result.current.canToggle).toBe(true);
  });

  it("padrão é sempre 'completo' — nunca esconde nada sem o usuário escolher", () => {
    const { result } = renderHook(() => useAppMode(buildUser()));
    expect(result.current.mode).toBe("completo");
  });

  it("setMode('acao') muda o modo e persiste por usuário no localStorage", () => {
    const user = buildUser();
    const { result } = renderHook(() => useAppMode(user));

    act(() => result.current.setMode("acao"));

    expect(result.current.mode).toBe("acao");
    expect(localStorage.getItem(`rotta-app-mode:${user.id}`)).toBe("acao");
  });

  it("lembra o modo salvo ao remontar para o mesmo usuário", () => {
    const user = buildUser();
    localStorage.setItem(`rotta-app-mode:${user.id}`, "acao");

    const { result } = renderHook(() => useAppMode(user));

    expect(result.current.mode).toBe("acao");
  });

  it("nunca retorna 'acao' quando canToggle é false, mesmo que o localStorage tenha 'acao' de uma sessão anterior", () => {
    const user = buildUser({ companyType: "LTDA" });
    localStorage.setItem(`rotta-app-mode:${user.id}`, "acao");

    const { result } = renderHook(() => useAppMode(user));

    expect(result.current.mode).toBe("completo");
  });
});
