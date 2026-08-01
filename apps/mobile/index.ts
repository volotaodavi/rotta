import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent chama AppRegistry.registerComponent('main', () => App)
// e cuida de carregar o Expo Go ou o app nativo de forma equivalente,
// seja rodando com Expo Go ou em um build nativo.
registerRootComponent(App);
