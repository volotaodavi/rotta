/**
 * @rotta/maps — abstração de mapas da Rotta (Rotta Geo Platform, Dossiê
 * 9 Secao 2.6 e Dossie 22, Secao 5.11).
 *
 * ADR ATUALIZADO (substitui a decisão anterior — não é mais híbrido
 * Google Maps + Mapbox): Mapbox é o ÚNICO motor de mapas/geocodificação
 * em todas as plataformas (Android/iOS/Web), espelhando o backend —
 * `apps/api/src/modules/geo/geo-engine.service.ts` (`GeoEngineService`)
 * é a única porta de saída para o Mapbox no servidor; aqui, `./web` e
 * `./native` são as únicas portas de entrada no cliente. Nenhum app
 * importa `mapbox-gl`/`@rnmapbox/maps` diretamente — sempre por um
 * destes dois subpaths (mesma convenção de `@rotta/auth`/`@rotta/ui`:
 * sem export default na raiz do pacote, só `./web` e `./native`).
 *
 * Geocodificação/rota continuam vivendo só no backend (`GeoPipelineService`,
 * `GET /geo/mapa/marcadores|proximas`) — este pacote é puramente de
 * RENDERIZAÇÃO do resultado já calculado pelo servidor, nunca chama o
 * Mapbox Geocoding/Directions API do cliente.
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
   * Token público do Mapbox (`pk.*`) — lido pelo app chamador a partir
   * da própria configuração de ambiente validada (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`/
   * `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`), nunca pelo pacote (Dossiê 23,
   * Secao 8 — nenhum `packages/*` lê `process.env` diretamente).
   */
  accessToken: string;
  markers: RottaMapMarker[];
  /** Centro inicial da câmera — se omitido, o mapa enquadra todos os `markers`. */
  initialCenter?: Coordenada;
  initialZoom?: number;
  /** Disparado quando o usuário termina de mover/dar zoom no mapa (debounced pela implementação) — use para buscar novos marcadores via `GET /geo/mapa/marcadores`. */
  onBoundsChange?: (bounds: BoundingBox) => void;
  onMarkerPress?: (marker: RottaMapMarker) => void;
  /** Testado apenas com os estilos padrão do Mapbox (`dark-v11`/`light-v11`) — um estilo Mapbox Studio com a identidade visual completa da Rotta é um passo de design separado (requer acesso ao Mapbox Studio, não disponível neste pacote) e pode ser passado aqui sem mudar a API. */
  styleUrl?: string;
}
