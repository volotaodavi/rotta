import { NavigationContainer } from "@react-navigation/native";

import { AuthNavigator } from "./AuthNavigator";
// import { DriverNavigator } from "./DriverNavigator";
// import { ParentNavigator } from "./ParentNavigator";

/**
 * Navigator raiz — decide entre `AuthNavigator` e o navigator do papel
 * ativo do usuario autenticado (Motorista/Monitor -> `DriverNavigator`,
 * Responsavel -> `ParentNavigator`), conforme Dossie 10 Secao 11.1 e
 * Dossie 23 Secao 4.2: a arvore de navegacao e estruturalmente diferente
 * por papel, nao apenas uma tela escondida por permissao.
 *
 * TODO (quando `@rotta/auth` tiver implementacao real, Dossie 15): ler a
 * sessao/papel ativo e escolher o navigator correspondente. Por ora,
 * sempre exibe `AuthNavigator` (nenhuma sessao existe ainda — fase de
 * fundacao).
 */
export function RootNavigator(): JSX.Element {
  return (
    <NavigationContainer>
      <AuthNavigator />
    </NavigationContainer>
  );
}
