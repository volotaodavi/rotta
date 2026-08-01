import { StatusBar } from "expo-status-bar";

import { RootNavigator } from "@/navigation/RootNavigator";
import { AppProviders } from "@/providers/app-providers";

/**
 * Ponto de entrada do app mobile (Dossie 22, Secao 4.2). Nenhuma tela de
 * negocio implementada ainda — apenas a fundacao (providers + navegacao
 * condicionada por papel, placeholders de tela).
 */
export default function App(): JSX.Element {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <RootNavigator />
    </AppProviders>
  );
}
