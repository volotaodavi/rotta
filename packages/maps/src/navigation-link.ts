/**
 * Deep-link para o app de navegação NATIVO do aparelho (Apple Maps no
 * iOS, Google Maps em todo o resto) — resposta ao pedido do usuário
 * (Frente Q/2ª referência): "acha melhor integrar o Google Maps para
 * navegação e GPS, enquanto o openstreet fica para os responsáveis". A
 * Rotta nunca embute um SDK de navegação turn-by-turn de terceiro (custo
 * recorrente por corrida, mesmo problema que motivou trocar Mapbox por
 * OpenStreetMap — ver Dossiê 22 Seção 5.11): em vez disso, o botão
 * "Navegar" do motorista/monitor só monta uma URL universal e entrega
 * pro sistema operacional abrir o app já instalado no aparelho — sem
 * chave de API, sem custo por chamada, sem dependência nova. O mapa
 * OpenStreetMap embutido (`RottaMap`) continua sendo a ÚNICA fonte de
 * verdade pro Responsável acompanhar o transporte em tempo real — este
 * util nunca é usado nesse lado (ver `route-screen-chrome.tsx`).
 *
 * As duas URLs são "universal links" oficiais dos respectivos apps
 * (Apple: developer.apple.com/library, seção "Apple Maps Links" —
 * `daddr`/`dirflg=d`; Google: developers.google.com/maps/documentation/
 * urls/get-started — `api=1`), então funcionam em qualquer plataforma
 * mesmo sem o app instalado (cai na versão web).
 */

export type NavigationApp = "apple" | "google";

/** Coordenadas reais de uma parada de rota já carregada — nunca uma estimativa. */
export interface NavigationDestination {
  latitude: number;
  longitude: number;
}

/**
 * Decide qual app abrir a partir do `navigator.userAgent` do navegador
 * (web/PWA) — só usado do lado web; o app nativo já sabe sua própria
 * plataforma via `Platform.OS` do React Native, sem precisar disto.
 */
export function detectNavigationApp(userAgent: string): NavigationApp {
  return /iPad|iPhone|iPod/i.test(userAgent) ? "apple" : "google";
}

/** Monta a URL de navegação turn-by-turn até `destination`, no app escolhido. */
export function buildNavigationUrl(destination: NavigationDestination, app: NavigationApp): string {
  const { latitude, longitude } = destination;

  if (app === "apple") {
    return `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
}
