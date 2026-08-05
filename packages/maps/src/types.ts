/**
 * @rotta/maps — abstração de mapas da Rotta (Rotta Geo Platform, Dossiê
 * 9 Secao 2.6 e Dossie 22, Secao 5.11).
 *
 * ADR ATUALIZADO (substitui o Mapbox pelo OpenStreetMap): MapLibre GL
 * JS/Native (fork open-source do Mapbox GL JS/Native, API quase
 * idêntica) sobre tiles do OpenStreetMap é o ÚNICO motor de mapas em
 * todas as plataformas (Android/iOS/Web), espelhando o backend —
 * `apps/api/src/modules/geo/geo-engine.service.ts` (`GeoEngineService`)
 * é a única porta de saída para Nominatim/OSRM no servidor; aqui,
 * `./web` e `./native` são as únicas portas de entrada no cliente.
 * Nenhum app importa `maplibre-gl`/`@maplibre/maplibre-react-native`
 * diretamente — sempre por um destes dois subpaths (mesma convenção de
 * `@rotta/auth`/`@rotta/ui`: sem export default na raiz do pacote, só
 * `./web` e `./native`).
 *
 * Diferente do Mapbox, MapLibre + tiles públicos do OpenStreetMap
 * (ex. OpenFreeMap, usado como padrão em `./web`/`./native`) não
 * exigem NENHUM token — `accessToken` continua um campo opcional aqui
 * só para o dia em que a Rotta apontar para um provedor de tiles
 * pago/self-hosted que exija autenticação.
 *
 * Geocodificação/rota continuam vivendo só no backend (`GeoPipelineService`,
 * `GET /geo/mapa/marcadores|proximas`) — este pacote é puramente de
 * RENDERIZAÇÃO do resultado já calculado pelo servidor, nunca chama
 * Nominatim/OSRM do cliente.
 */

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface RottaMapMarker extends Coordenada {
  id: string;
  /** Exibido no callout/popup ao tocar/clicar no marcador. */
  titulo: string;
}

export interface BoundingBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface RottaMapProps {
  /**
   * Token do provedor de tiles — opcional (MapLibre + OpenFreeMap, o
   * padrão deste pacote, não exigem nenhum). Só relevante se o app
   * chamador apontar `styleUrl` para um provedor pago/self-hosted que
   * exija autenticação; lido pelo próprio app a partir da sua
   * configuração de ambiente (`NEXT_PUBLIC_MAPTILES_ACCESS_TOKEN`/
   * `EXPO_PUBLIC_MAPTILES_ACCESS_TOKEN`), nunca por este pacote
   * (Dossiê 23, Secao 8 — nenhum `packages/*` lê `process.env`
   * diretamente).
   */
  accessToken?: string;
  markers: RottaMapMarker[];
  /**
   * Trajeto a desenhar como linha (ex. sequência de paradas de uma
   * rota, ou o exemplo interativo da landing page) — puramente visual,
   * nunca calculado no cliente (a sequência já vem pronta de quem
   * chama, seja um `RouteStop[]` real ou coordenadas de exemplo).
   */
  route?: Coordenada[];
  /** Cor da linha do `route`, formato CSS (ex. `#3b6ef6`) — padrão: azul da marca Rotta. */
  routeColor?: string;
  /** Centro inicial da câmera — se omitido, o mapa enquadra todos os `markers`. */
  initialCenter?: Coordenada;
  initialZoom?: number;
  /** Disparado quando o usuário termina de mover/dar zoom no mapa (debounced pela implementação) — use para buscar novos marcadores via `GET /geo/mapa/marcadores`. */
  onBoundsChange?: (bounds: BoundingBox) => void;
  onMarkerPress?: (marker: RottaMapMarker) => void;
  /** URL de um estilo MapLibre (vetor, https://maplibre.org/maplibre-style-spec/) — padrão: tiles RASTER puros do OpenStreetMap (`tile.openstreetmap.org`), sem token, mais resilientes que um estilo vetorial (ver nota em `./web/index.tsx`). */
  styleUrl?: string;
}
