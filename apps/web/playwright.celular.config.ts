import { defineConfig, devices } from "@playwright/test";

import base from "./playwright.config";

/**
 * A mesma suíte, num iPhone, gravando vídeo.
 *
 * ## Por que isto existe
 *
 * Porque o sócio usa iPhone, e o aplicativo nativo não chega lá sem
 * conta paga de Apple Developer: o perfil `preview` do `eas.json` é de
 * SIMULADOR (`ios: { simulator: true }`), que não instala em aparelho,
 * e nenhum perfil de `submit` tem `ios` configurado. Some-se que
 * `@maplibre/maplibre-react-native` é módulo nativo próprio, então o
 * Expo Go — a saída sem Mac e sem conta — quebraria justamente nas
 * telas de mapa, que são o produto.
 *
 * O que sobra, e funciona hoje, é o painel no Safari do iPhone. Este
 * config prova que ele funciona nessa largura, em vez de supor: roda
 * os mesmos fluxos verificados, num viewport de iPhone de verdade.
 *
 * Um fluxo que falha AQUI e passa no config de desktop não é teste
 * instável — é defeito de responsividade, e é exatamente o que este
 * arquivo existe para encontrar.
 *
 * Uso:
 *   pnpm --filter @rotta/web exec playwright test --config playwright.celular.config.ts
 */
export default defineConfig({
  ...base,
  use: {
    ...base.use,
    ...devices["iPhone 14 Pro"],
    // `devices` do Playwright traz o WebKit do iPhone, mas este
    // ambiente só tem Chromium instalado — então fica o motor do
    // Chromium com as MEDIDAS e o toque do iPhone. Mede layout, que é
    // a pergunta aqui; não mede diferença de engine do Safari.
    defaultBrowserType: "chromium",
    video: { mode: "on", size: { width: 393, height: 852 } },
  },
  projects: [{ name: "iphone" }],
});
