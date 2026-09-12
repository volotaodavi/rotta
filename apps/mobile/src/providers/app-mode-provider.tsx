import { createContext, useContext } from "react";

import type { AppModeState } from "@/features/driver/hooks/use-app-mode";
import type { ReactNode } from "react";

const AppModeContext = createContext<AppModeState | null>(null);

/**
 * Compartilha uma ÚNICA instância de `useAppMode` (chamada uma vez em
 * `RootNavigator`, que decide ali mesmo qual navigator renderizar) com
 * os Perfis de Empresa e de Motorista/Monitor — onde mora o botão de
 * alternar "Visão completa"/"Modo Ação". Os dois pontos ficam em ramos
 * diferentes da árvore de navegação; sem este Provider, cada tela
 * chamando `useAppMode` por conta própria criaria estados
 * independentes (alternar no Perfil não trocaria o navigator que
 * `RootNavigator` decidiu renderizar).
 */
export function AppModeProvider({
  value,
  children,
}: {
  value: AppModeState;
  children: ReactNode;
}): JSX.Element {
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppModeContext(): AppModeState {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error("useAppModeContext() precisa ser usado dentro de um <AppModeProvider>.");
  }
  return context;
}
