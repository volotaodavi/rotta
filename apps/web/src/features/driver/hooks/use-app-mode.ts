"use client";

import { useEffect, useState } from "react";

import type { MeResponse } from "@rotta/api-client";

import { isStandalone } from "@/lib/pwa";


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
 * Palpite inicial (só na PRIMEIRA vez, antes de qualquer escolha
 * salva): quem abre o app JÁ INSTALADO (`isStandalone`, mesma checagem
 * de `install-app-prompt.tsx`) tende a estar prestes a dirigir, então
 * começa em "Modo Ação"; quem abre pelo navegador comum (aba normal,
 * geralmente desktop) tende a estar cuidando do back-office, começa em
 * "Visão completa". É só um palpite — a partir do primeiro toque no
 * alternador, a escolha do usuário sempre vence, salva por usuário em
 * `localStorage` (nunca no backend — é só uma preferência de exibição,
 * não uma permissão, ver `use-driver-routes.ts`/nota do layout).
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
    if (stored === "acao" || stored === "completo") {
      setModeState(stored);
    } else {
      setModeState(isStandalone() ? "acao" : DEFAULT_MODE);
    }
  }, [canToggle, user]);

  function setMode(next: AppMode): void {
    setModeState(next);
    if (user) {
      localStorage.setItem(STORAGE_PREFIX + user.id, next);
    }
  }

  return { mode: canToggle ? mode : "completo", canToggle, setMode };
}
