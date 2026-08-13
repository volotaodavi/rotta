"use client";

import { useEffect, useState } from "react";

import type { MeResponse } from "@rotta/api-client";

export type AppMode = "completo" | "acao";

const STORAGE_PREFIX = "rotta-app-mode:";
const DEFAULT_MODE: AppMode = "completo";

/**
 * Alternador "Visão completa"/"Modo Ação" do Painel Web (Frente G,
 * pedido do usuário em produção). Existe só para Motorista/Monitor
 * autônomo e MEI — quem no schema (`CompanyType.AUTONOMO`/`MEI`) É o
 * próprio Administrador da empresa (`role === "empresa"`), então
 * enxerga hoje o painel de gestão inteiro (Empresa, Equipe, Veículos,
 * Escolas, Marketplace...) mesmo quando só quer ver o essencial do dia
 * a dia dirigindo. Motorista/Monitor FUNCIONÁRIO de uma empresa maior
 * nunca vê esse alternador — o dele é outro `role` (motorista/monitor,
 * não empresa) e outra experiência (app mobile), então nunca cai nesta
 * função com `canToggle === true`.
 *
 * "Visão completa" é sempre o padrão (nunca esconde nada por padrão) —
 * o usuário PRECISA escolher "Modo Ação" pra reduzir o menu, e essa
 * escolha é lembrada por usuário (`localStorage`, nunca no backend —
 * é só uma preferência de exibição, não uma permissão, ver
 * `use-driver-routes.ts`/nota do layout).
 */
export function useAppMode(user: MeResponse | null): {
  mode: AppMode;
  canToggle: boolean;
  setMode: (mode: AppMode) => void;
} {
  const canToggle =
    user?.role === "empresa" && (user.companyType === "AUTONOMO" || user.companyType === "MEI");

  const [mode, setModeState] = useState<AppMode>(DEFAULT_MODE);

  useEffect(() => {
    if (!canToggle || !user) {
      setModeState(DEFAULT_MODE);
      return;
    }
    const stored = localStorage.getItem(STORAGE_PREFIX + user.id);
    setModeState(stored === "acao" ? "acao" : DEFAULT_MODE);
  }, [canToggle, user]);

  function setMode(next: AppMode): void {
    setModeState(next);
    if (user) {
      localStorage.setItem(STORAGE_PREFIX + user.id, next);
    }
  }

  return { mode: canToggle ? mode : "completo", canToggle, setMode };
}
