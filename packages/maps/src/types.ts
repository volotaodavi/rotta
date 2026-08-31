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
  /**
   * `true` quando o marcador representa um veículo em viagem (GPS-01/03/06)
   * — desenhado como um ícone de veículo em vez do pino de localização
   * padrão. Omitido/`false` para posições estáticas (escola, parada,
   * endereço da empresa), que continuam usando o pino. Quem chama já sabe
   * essa distinção (uma viagem `EM_ANDAMENTO` vs. um cadastro fixo) —
   * nunca inferida por delta de posição aqui.
   */
  emMovimento?: boolean;
}

export interface BoundingBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/** Um ponto de densidade do heatmap (Prompt 22/Dossiê 30 — Central de Inteligência Operacional) — `peso` alimenta a propriedade `heatmap-weight` do MapLibre, nunca desenhado como marcador individual. */
export interface HeatmapPoint extends Coordenada {
  peso: number;
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
  /** Camada de densidade (heatmap) — pontos já agregados pelo servidor (ex. `GET /analytics/national/heatmap`), nunca recalculado no cliente. Omitido = sem camada de heatmap. */
  heatmapPoints?: HeatmapPoint[];
  /** Cor da linha do `route`, formato CSS (ex. `#3b6ef6`) — padrão: azul da marca Rotta. */
  routeColor?: string;
  /** Centro inicial da câmera — se omitido, o mapa enquadra todos os `markers`. */
  initialCenter?: Coordenada;
  initialZoom?: number;
  /** Disparado quando o usuário termina de mover/dar zoom no mapa (debounced pela implementação) — use para buscar novos marcadores via `GET /geo/mapa/marcadores`. */
  onBoundsChange?: (bounds: BoundingBox) => void;
  onMarkerPress?: (marker: RottaMapMarker) => void;
  /** URL de um estilo MapLibre (vetor, https://maplibre.org/maplibre-style-spec/) — padrão: estilo `liberty` da OpenFreeMap (`tiles.openfreemap.org`), sem token (ver nota em `./web/index.tsx`). */
  styleUrl?: string;
  /**
   * "Mapa em modo GPS" (auditoria 31/08/2026, pedido do usuário: "o mapa
   * deverá ser igual GPS mesmo... podendo centralizar o mapa de acordo
   * com a rota do veículo"). Quando `true`, a câmera acompanha
   * suavemente o marcador `emMovimento` a cada nova posição, em vez de
   * só mover o marcador com a câmera parada. Desliga sozinho no
   * primeiro gesto manual do usuário (arrastar/dar zoom) — mesmo
   * comportamento de qualquer app de navegação — e volta a ligar na
   * próxima montagem do componente (o botão "Recentralizar" já existente
   * remonta o mapa, então também religa o follow). Padrão `false`
   * (mudança de comportamento opt-in, nunca automática em telas que não
   * pediram).
   */
  followMode?: boolean;
}

/**
 * Auditoria de produção (27/08/2026, usuário: "o mapa não está
 * aparecendo... só um pino no meio do nada") — a causa era uma
 * coordenada `(0, 0)` ("Null Island", Golfo da Guiné) chegando como
 * `initialCenter`/marcador por causa de um dado ruim rio acima (parada
 * cadastrada sem geocodificação real, endereço placeholder). Corrigido
 * na origem (`TripsService`), mas o mapa em si NUNCA deveria confiar
 * cegamente numa coordenada vinda de fora: nenhum lugar real do Brasil
 * fica em 0°/0°, então tratar isso como "sem coordenada" (em vez de
 * literalmente centralizar/desenhar um pino no oceano) é a rede de
 * segurança final — usada tanto em `./web` quanto `./native` pra
 * filtrar `markers`/`initialCenter` ANTES de qualquer chamada ao
 * MapLibre, protegendo contra essa classe de bug inteira, não só a
 * instância já corrigida.
 */
export function isCoordenadaValida(coordenada: Coordenada | null | undefined): boolean {
  if (!coordenada) return false;
  const { latitude, longitude } = coordenada;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return Math.abs(latitude) > 0.0001 || Math.abs(longitude) > 0.0001;
}
