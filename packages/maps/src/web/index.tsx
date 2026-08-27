"use client";

import {
  LngLatBounds,
  MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
} from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import { isCoordenadaValida } from "../types";
import { vehicleIconMarkup } from "../vehicle-icon";

import type { Coordenada, HeatmapPoint, RottaMapProps } from "../types";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";

import "maplibre-gl/dist/maplibre-gl.css";

export type {
  RottaMapProps,
  RottaMapMarker,
  BoundingBox,
  Coordenada,
  HeatmapPoint,
} from "../types";
export { isCoordenadaValida } from "../types";

let globalMapTilerApiKey: string | undefined;

/**
 * Configura, uma única vez no bootstrap de cada app (chamado no CORPO
 * de render do provider raiz — `AppProviders` de `apps/web`/`apps/admin`
 * — nunca dentro de um `useEffect`: efeitos de componentes filhos, como
 * o de setup do `<RottaMap/>` logo abaixo, disparam ANTES do efeito do
 * próprio provider raiz, então configurar aqui de dentro de um efeito
 * arriscaria o primeiro mapa da tela montar antes da chave estar
 * disponível), qual provedor de tiles usar.
 *
 * Pedido do usuário (auditoria do mapa em produção, 27/08/2026): "pelo
 * menos aquele [com aviso de API key] o mapa aparecia" — o histórico
 * completo (ver comentário logo abaixo) mostra que provedores públicos
 * sem chave (OSM direto, depois OpenFreeMap) têm ficado instáveis em
 * produção sem nenhum erro visível. Chamado sem `mapTilerApiKey` (ou
 * nunca chamado), o comportamento é EXATAMENTE o mesmo de antes —
 * OpenFreeMap, sem chave nenhuma (stub honesto, nunca quebra o app de
 * quem não configurou nada).
 */
export function configureRottaMaps(options: { mapTilerApiKey?: string }): void {
  globalMapTilerApiKey = options.mapTilerApiKey || undefined;
}

/**
 * Resolve a URL de estilo padrão — MapTiler (com a chave configurada via
 * `configureRottaMaps`), quando disponível, senão a OpenFreeMap `liberty`
 * de sempre. `streets-v2` é o estilo mais próximo, visualmente, do
 * `liberty` (ruas/labels/água), mantendo a mesma identidade visual do
 * mapa em toda a plataforma independente do provedor por trás.
 */
function resolveDefaultStyleUrl(): string {
  if (globalMapTilerApiKey) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${globalMapTilerApiKey}`;
  }
  return DEFAULT_STYLE_URL;
}

/**
 * Estilo padrão do mapa — VETORIAL `liberty`, servido pela OpenFreeMap
 * (`tiles.openfreemap.org`), sem token/chave nenhuma.
 *
 * Histórico (pra quem for mexer aqui de novo): usávamos tiles RASTER da
 * CARTO (`basemaps.cartocdn.com/rastertiles/voyager`), achando que era
 * uma CDN gratuita sem autenticação — só que a CARTO passou a EXIGIR
 * chave de API pra qualquer requisição (confirmado com `curl`: toda
 * imagem devolvida, mesmo com HTTP 200, vem com a marca d'água "API KEY
 * REQUIRED" carimbada em cima do próprio tile — não é um erro nosso de
 * configuração, é a régua nova deles). Reproduzido pelo usuário direto
 * no app publicado ("aparece um aviso dentro do mapa pedindo API key"),
 * com print confirmando a marca d'água. Antes disso, também abandonamos
 * `tile.openstreetmap.org` direto (hotlinking de produção viola a Tile
 * Usage Policy da OSM Foundation e passou a ser bloqueado por lá, sem
 * erro visível — o mapa só ficava em branco).
 *
 * A tentativa anterior de usar a própria OpenFreeMap tinha ficado com a
 * tela branca — mas o problema não era o provedor, era o antigo hábito
 * de compor um estilo à mão puxando tiles/sprite/glyphs de domínios
 * diferentes (qualquer um fora do ar e nada desenha, sem erro visível).
 * Usando a URL do estilo pronto da própria OpenFreeMap (abaixo), tiles,
 * sprite e glyphs vêm todos do MESMO domínio — testado com `curl`
 * confirmando as três respostas (`/styles/liberty`, `/planet` tilejson,
 * tiles `.pbf`) antes de trocar aqui. Documentação e termos de uso em
 * openfreemap.org — hospedagem própria, sem limite de requisição
 * documentado para uso razoável, pensada exatamente pra evitar esse
 * tipo de exigência de chave.
 */
const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_ZOOM = 12;
/** São Paulo — só usado quando não há `initialCenter` nem `markers` (mapa vazio). */
const FALLBACK_CENTER: [number, number] = [-46.633309, -23.55052];
const DEFAULT_ROUTE_COLOR = "#3b6ef6";
const MARKER_COLOR = "#2563eb";
const ROUTE_SOURCE_ID = "rotta-route";
const ROUTE_LAYER_ID = "rotta-route-line";
const HEATMAP_SOURCE_ID = "rotta-heatmap";
const HEATMAP_LAYER_ID = "rotta-heatmap-layer";

/**
 * Teto de espera pelo evento `load` do estilo antes de considerar o mapa
 * travado — histórico real deste arquivo (ver `DEFAULT_STYLE_URL` acima):
 * TRÊS incidentes de produção diferentes (CDN exigindo chave, hotlink
 * bloqueado pela OSM Foundation, estilo composto à mão com domínio fora
 * do ar) todos se manifestaram do MESMO jeito — nenhum erro visível,
 * `map.on("error")` às vezes nem chega a disparar (a requisição trava
 * sem responder, nem sucesso nem falha), e o usuário só via uma área
 * branca sem explicação nenhuma. Cada vez foi preciso um print do
 * usuário pra descobrir. Este timeout é a rede de segurança pra
 * qualquer QUARTA causa ainda não vista: se nem sucesso nem erro
 * chegou depois disso, mostra o estado de falha mesmo assim.
 */
const MAP_LOAD_TIMEOUT_MS = 15_000;

/**
 * Abaixo disto, uma posição nova chegou rápido demais pra ser um poll
 * de GPS real (o carrossel animado da hero da landing page,
 * `HeroMapDemo`, também usa `emMovimento: true` e atualiza a posição a
 * cada frame — ~16ms, ~60x/s). Nesse caso o marcador só salta direto
 * (`setLngLat` instantâneo, comportamento de sempre) — animar um
 * deslizamento de segundos entre posições que trocam a cada frame
 * faria o marcador nunca alcançar o alvo de verdade (o alvo já teria
 * mudado de novo antes da animação terminar).
 */
const HIGH_FREQUENCY_UPDATE_THRESHOLD_MS = 400;
/**
 * Teto do deslizamento suave — mesmo se a app ficar um tempo anormal
 * sem uma posição nova (aba em segundo plano, GPS instável), o
 * marcador nunca demora mais que isto pra alcançar a posição real.
 */
const MAX_VEHICLE_MOVE_ANIMATION_MS = 3000;

interface MarkerEntry {
  marker: Marker;
  emMovimento: boolean;
  /** `requestAnimationFrame` em andamento do deslizamento suave (só para `emMovimento`) — cancelado/substituído a cada nova posição recebida. */
  animationFrame?: number;
  /** `performance.now()` da última posição recebida — usado só pra medir o intervalo real entre polls (ver `HIGH_FREQUENCY_UPDATE_THRESHOLD_MS`). */
  lastUpdatedAt?: number;
}

/** Elemento DOM do ícone de veículo (`marker.emMovimento`) — ver `vehicle-icon.ts`. */
function buildVehicleMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = vehicleIconMarkup(MARKER_COLOR);
  el.style.cursor = "pointer";
  return el;
}

/**
 * Desliza suavemente um marcador `emMovimento` da posição atual até
 * `target`, interpolando linearmente (lerp) quadro a quadro, em vez do
 * `setLngLat` instantâneo padrão — pedido do usuário: "diminuir o
 * tempo de mostrar o veículo se movendo... algo que fique suave e
 * contínuo até o encerramento da rota" (era um salto instantâneo a
 * cada poll). A duração da animação se ADAPTA ao intervalo real desde
 * a última posição recebida (tipicamente ~3s, o `refetchInterval` de
 * `use-gps.ts`) — o marcador termina de deslizar até a posição atual
 * um instante antes da próxima chegar, então nunca fica "esperando
 * parado" nem "atrasado". Uma posição nova chegando NO MEIO de uma
 * animação em andamento cancela a anterior e recomeça a partir de
 * onde o marcador está agora (nunca "pula" pra trás).
 */
function animateMarkerTo(entry: MarkerEntry, target: [number, number]): void {
  const now = performance.now();
  const elapsedSinceLastUpdate =
    entry.lastUpdatedAt === undefined ? undefined : now - entry.lastUpdatedAt;
  entry.lastUpdatedAt = now;

  if (entry.animationFrame !== undefined) cancelAnimationFrame(entry.animationFrame);

  const start = entry.marker.getLngLat();
  const from: [number, number] = [start.lng, start.lat];
  if (from[0] === target[0] && from[1] === target[1]) return;

  if (
    elapsedSinceLastUpdate === undefined ||
    elapsedSinceLastUpdate < HIGH_FREQUENCY_UPDATE_THRESHOLD_MS
  ) {
    entry.marker.setLngLat(target);
    return;
  }

  const durationMs = Math.min(elapsedSinceLastUpdate, MAX_VEHICLE_MOVE_ANIMATION_MS);
  const step = (frameNow: number): void => {
    const t = Math.min((frameNow - now) / durationMs, 1);
    entry.marker.setLngLat([
      from[0] + (target[0] - from[0]) * t,
      from[1] + (target[1] - from[1]) * t,
    ]);
    entry.animationFrame = t < 1 ? requestAnimationFrame(step) : undefined;
  };
  entry.animationFrame = requestAnimationFrame(step);
}

/** Desenha/atualiza a linha do `route` (GeoJSON LineString) — chamado só quando o estilo já carregou (ver nota no efeito abaixo). */
function applyRoute(map: MapLibreMap, route: Coordenada[] | undefined, color: string): void {
  const data: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: (route ?? []).map((c) => [c.longitude, c.latitude]),
    },
  };

  const existingSource = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(data);
    if (map.getLayer(ROUTE_LAYER_ID)) {
      map.setPaintProperty(ROUTE_LAYER_ID, "line-color", color);
    }
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": 4, "line-opacity": 0.9 },
  });
}

/**
 * Camada de densidade (heatmap) — pontos já agregados pelo servidor
 * (ex. `GET /analytics/national/heatmap`, Dossiê 30), nunca recalculado
 * aqui. Tipo nativo `heatmap` do MapLibre (mesmo motor OSM de todo o
 * resto do pacote, sem lib adicional tipo `leaflet.heat`).
 */
function applyHeatmap(map: MapLibreMap, points: HeatmapPoint[] | undefined): void {
  const data: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: (points ?? []).map((point) => ({
      type: "Feature",
      properties: { peso: point.peso },
      geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
    })),
  };

  const existingSource = map.getSource(HEATMAP_SOURCE_ID) as GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(data);
    return;
  }

  map.addSource(HEATMAP_SOURCE_ID, { type: "geojson", data });
  map.addLayer({
    id: HEATMAP_LAYER_ID,
    type: "heatmap",
    source: HEATMAP_SOURCE_ID,
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "peso"], 0, 0, 10, 1],
      "heatmap-intensity": 1,
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(59,110,246,0)",
        0.2,
        "rgba(59,110,246,0.35)",
        0.4,
        "rgba(37,99,235,0.55)",
        0.6,
        "rgba(29,78,216,0.75)",
        1,
        "rgba(30,58,138,0.9)",
      ],
      "heatmap-radius": 22,
      "heatmap-opacity": 0.85,
    },
  });
}

/**
 * `<RottaMap />` (web) — único componente do app que importa
 * `maplibre-gl` diretamente (ver ADR em `../types.ts`). Renderiza os
 * marcadores já calculados pelo Map Intelligence Agent (`GET
 * /geo/mapa/marcadores`); NUNCA chama Nominatim/OSRM do navegador.
 * `route` (opcional) desenha uma linha estática por cima do mapa — usado
 * pela demonstração interativa da Landing Page e por telas reais de
 * trajeto de rota (`RouteStop[]` em ordem).
 */
export function RottaMap({
  markers: markersProp,
  route,
  routeColor = DEFAULT_ROUTE_COLOR,
  heatmapPoints,
  initialCenter: initialCenterProp,
  initialZoom = DEFAULT_ZOOM,
  onBoundsChange,
  onMarkerPress,
  styleUrl,
}: RottaMapProps): JSX.Element {
  // Rede de segurança final contra `(0, 0)`/"Null Island" (ver
  // `isCoordenadaValida`) — nunca desenha um marcador nem centraliza a
  // câmera numa coordenada que nenhum dado real do Brasil produziria.
  const markers = markersProp.filter((marker) => isCoordenadaValida(marker));
  const initialCenter =
    initialCenterProp && isCoordenadaValida(initialCenterProp) ? initialCenterProp : undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const previousMarkerIdsRef = useRef<Set<string>>(new Set());
  /**
   * `"error"` cobre tanto uma falha explícita do MapLibre (evento
   * `error` — estilo/tile inválido, WebGL2 indisponível no aparelho)
   * quanto o silêncio total (nem `load` nem `error` em
   * `MAP_LOAD_TIMEOUT_MS`, ver comentário acima). `retryToken` força o
   * efeito de setup a recriar o `MapLibreMap` do zero quando o usuário
   * toca "Tentar novamente" — o mesmo padrão já usado no resto do app
   * pra estados de erro (nunca deixa o usuário preso sem saída).
   */
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryToken, setRetryToken] = useState(0);
  const handleRetry = useCallback(() => {
    setStatus("loading");
    setRetryToken((token) => token + 1);
  }, []);
  // Refs para os callbacks: evita recriar o mapa a cada render quando o
  // app chamador passa uma arrow function inline (padrão comum em
  // `onPress`/`onChange` de tela React) — só a criação do mapa (estilo/
  // container) precisa re-executar o efeito de setup.
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMarkerPressRef = useRef(onMarkerPress);
  onBoundsChangeRef.current = onBoundsChange;
  onMarkerPressRef.current = onMarkerPress;

  useEffect(() => {
    if (!containerRef.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: styleUrl ?? resolveDefaultStyleUrl(),
        center: initialCenter ? [initialCenter.longitude, initialCenter.latitude] : FALLBACK_CENTER,
        zoom: initialZoom,
      });
    } catch (err) {
      // Aparelho sem WebGL2 (exigido pelo MapLibre 6.x, sem fallback pra
      // WebGL1) ou qualquer outra falha síncrona na criação — sem isso,
      // a exceção sobe descoberta e pode derrubar a árvore React inteira
      // ao redor do mapa, não só a área do mapa.
      // eslint-disable-next-line no-console -- mesmo sinal de diagnóstico do catch abaixo.
      console.error("[RottaMap] Falha ao inicializar o mapa:", err);
      setStatus("error");
      return;
    }

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setStatus("error");
    }, MAP_LOAD_TIMEOUT_MS);

    map.addControl(new NavigationControl(), "top-right");

    // Sem isso, uma falha ao carregar o estilo (URL errada, tile server
    // fora do ar, WebGL2 indisponível) é silenciosa — o mapa fica com a
    // tela preta/branca padrão e nenhum erro aparece em lugar nenhum,
    // exceto o console. `setStatus("error")` é o que torna esse mesmo
    // sinal visível pro usuário (ver JSX de retorno abaixo).
    map.on("error", (event) => {
      // eslint-disable-next-line no-console -- único sinal visível de uma falha de estilo/tile.
      console.error("[RottaMap] Falha ao carregar o mapa:", event.error);
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      setStatus("error");
    });

    const emitBounds = (): void => {
      const bounds = map.getBounds();
      if (!bounds || !onBoundsChangeRef.current) return;
      onBoundsChangeRef.current({
        swLat: bounds.getSouth(),
        swLng: bounds.getWest(),
        neLat: bounds.getNorth(),
        neLng: bounds.getEast(),
      });
    };
    map.on("moveend", emitBounds);
    map.once("load", () => {
      emitBounds();
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      setStatus("ready");
    });

    mapRef.current = map;
    return () => {
      window.clearTimeout(timeoutId);
      map.remove();
      mapRef.current = null;
      // O mapa antigo levou seus marcadores junto (`map.remove()`) —
      // sem isso, um `styleUrl` novo recriaria o mapa mas o efeito de
      // marcadores abaixo continuaria achando (pelos ids em
      // `markersRef`) que eles já existem no mapa NOVO, e nunca os
      // recriaria de verdade.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- `markersRef` guarda um `Map` comum (não um nó do DOM React), sempre seguro de ler em `.current` no cleanup.
      for (const entry of markersRef.current.values()) {
        if (entry.animationFrame !== undefined) cancelAnimationFrame(entry.animationFrame);
      }
      markersRef.current.clear();
      previousMarkerIdsRef.current = new Set();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setup roda só quando o estilo muda (ou "Tentar novamente" incrementa retryToken); ver refs acima para os callbacks.
  }, [styleUrl, retryToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // BUG corrigido (usuário: "ainda precisa tocar 2x pra navegar" /
    // "trava" no Safari, Landing Page): este efeito remontava TODOS os
    // marcadores (remove + `new Marker()` + novo `Popup` + novo
    // listener) a cada mudança de `markers` — inofensivo pra uma
    // atualização de GPS a cada poucos segundos, mas o carrossel
    // animado da hero (`HeroMapDemo`) muda a posição do veículo a
    // cada frame (`requestAnimationFrame`, ~60x/s), e cada frame também
    // chamava `map.fitBounds(...)` de novo — no Safari/iOS (engine JS/
    // WebGL mais fraca que o Chromium) isso sozinho já satura a thread
    // principal a ponto do toque parecer "sem resposta"/precisar de um
    // segundo toque. Agora: marcador com o mesmo `id` só tem a posição
    // atualizada (`setLngLat`, barato) em vez de recriado; `fitBounds`
    // só roda quando o CONJUNTO de ids muda (marcador novo/removido),
    // nunca numa atualização pura de posição.
    const nextIds = new Set(markers.map((marker) => marker.id));
    for (const [id, entry] of markersRef.current) {
      if (!nextIds.has(id)) {
        if (entry.animationFrame !== undefined) cancelAnimationFrame(entry.animationFrame);
        entry.marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const marker of markers) {
      const existing = markersRef.current.get(marker.id);
      const emMovimento = marker.emMovimento ?? false;

      if (existing && existing.emMovimento === emMovimento) {
        // `emMovimento` desliza suavemente entre posições (ver
        // `animateMarkerTo`); um marcador estático (parada, escola)
        // não precisa disso — pula direto, sem custo de animação.
        if (emMovimento) {
          animateMarkerTo(existing, [marker.longitude, marker.latitude]);
        } else {
          existing.marker.setLngLat([marker.longitude, marker.latitude]);
        }
        existing.marker.getPopup()?.setText(marker.titulo);
        continue;
      }

      // Marcador novo, ou existente que trocou de tipo (estático <->
      // em movimento) — o elemento DOM do `Marker` não dá pra mudar de
      // "pino padrão" pra "ícone de veículo" depois de criado, então
      // esse caso raro ainda recria.
      if (existing?.animationFrame !== undefined) cancelAnimationFrame(existing.animationFrame);
      existing?.marker.remove();
      const mapMarker = emMovimento
        ? new Marker({ element: buildVehicleMarkerElement() })
        : new Marker({ color: MARKER_COLOR });
      mapMarker
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(new Popup({ offset: 24 }).setText(marker.titulo))
        .addTo(map);
      mapMarker.getElement().addEventListener("click", () => onMarkerPressRef.current?.(marker));
      markersRef.current.set(marker.id, { marker: mapMarker, emMovimento });
    }

    const idsChanged =
      nextIds.size !== previousMarkerIdsRef.current.size ||
      [...nextIds].some((id) => !previousMarkerIdsRef.current.has(id));
    previousMarkerIdsRef.current = nextIds;

    if (!initialCenter && markers.length > 0 && idsChanged) {
      const bounds = markers.reduce(
        (acc, marker) => acc.extend([marker.longitude, marker.latitude]),
        new LngLatBounds(
          [markers[0]!.longitude, markers[0]!.latitude],
          [markers[0]!.longitude, markers[0]!.latitude],
        ),
      );
      map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
    }
  }, [markers, initialCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // O estilo carrega de forma assíncrona (tiles remotos) — `addSource`/
    // `addLayer` só são seguros depois de `load`, que pode já ter
    // disparado (mapa recriado por troca de `styleUrl`) ou ainda não
    // (primeira montagem).
    if (map.isStyleLoaded()) {
      applyRoute(map, route, routeColor);
    } else {
      map.once("load", () => applyRoute(map, route, routeColor));
    }
  }, [route, routeColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      applyHeatmap(map, heatmapPoints);
    } else {
      map.once("load", () => applyHeatmap(map, heatmapPoints));
    }
  }, [heatmapPoints]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {status === "error" ? (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
            background: "#f8fafc",
            color: "#334155",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, maxWidth: 280 }}>
            Não foi possível carregar o mapa agora. Verifique sua conexão e tente de novo.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: MARKER_COLOR,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
    </div>
  );
}
