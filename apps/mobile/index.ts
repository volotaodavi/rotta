import { registerRootComponent } from "expo";

import App from "./App";
// Item 4 do pedido do usuário: "GPS continuar rodando de verdade em
// segundo plano" — `TaskManager.defineTask` (dentro deste módulo)
// PRECISA rodar assim que o bundle JS é executado, nunca só quando a
// tela do motorista é montada: é assim que o SO consegue religar o app
// em segundo plano (processo já morto) só pra entregar um lote de
// posições, sem passar pela navegação/tela nenhuma. Importado aqui, no
// próprio entrypoint, pra nunca depender de qual tela o usuário estava
// vendo por último.
import "./src/features/driver/hooks/background-trip-location-task";

// registerRootComponent chama AppRegistry.registerComponent('main', () => App)
// e cuida de carregar o Expo Go ou o app nativo de forma equivalente,
// seja rodando com Expo Go ou em um build nativo.
registerRootComponent(App);
