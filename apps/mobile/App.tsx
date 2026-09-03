import { StatusBar } from "expo-status-bar";

import { AppErrorBoundary } from "@/components/app-error-boundary";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AppProviders } from "@/providers/app-providers";

/**
 * Ponto de entrada do app mobile (Dossie 22, Secao 4.2).
 *
 * `AppErrorBoundary` (auditoria minuciosa 03/09/2026) envolve TUDO —
 * inclusive `AppProviders` — de propósito: é a rede de segurança contra
 * um erro de render não tratado em qualquer lugar da árvore, então não
 * pode ficar por baixo de nada que possa ter sido a própria causa do
 * erro (ver a nota completa no componente).
 */
export default function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <StatusBar style="light" />
        <RootNavigator />
      </AppProviders>
    </AppErrorBoundary>
  );
}
