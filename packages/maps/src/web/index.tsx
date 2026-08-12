"use client";

import {
  LngLatBounds,
  MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

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

/**
 * Tiles RASTER com dados do OpenStreetMap, servidos pela CDN da CARTO
 * (`basemaps.cartocdn.com`, estilo "Voyager") — NÃO usa mais
 * `tile.openstreetmap.org` direto: hotlinking de app de produção contra
 * esse host viola a Tile Usage Policy da OSM Foundation
 * (operations.osmfoundation.org/policies/tiles) e passou a ser
 * bloqueado por lá (`HTTP 200` com header `x-blocked: Access denied`,
 * sem nenhum erro visível — o mapa só fica em branco). A CARTO publica
 * a mesma base de dados do OSM como CDN gratuita, sem token, feita
 * exatamente para uso direto de app (troca aqui feita depois de
 * confirmar via `curl` que `tile.openstreetmap.org` está bloqueado e
 * `basemaps.cartocdn.com` responde `200 image/png` normalmente).
 * `attribution` inclui os dois créditos exigidos (OSM + CARTO).
 *
 * Antes desta troca, o padrão era um estilo VETORIAL `liberty` do
 * OpenFreeMap (tiles.openfreemap.org), que ficava com a tela branca:
 * um estilo vetorial depende de VÁRIOS fetches extras (o próprio
 * `style.json`, sprite, glyphs) além dos tiles em si — se qualquer um
 * desses domínios estiver bloqueado/fora do ar, o MapLibre não desenha
 * nada e não existe nenhum sinal visível disso fora do console
 * (`map.on("error", ...)` abaixo). Um estilo raster inline como este só
 * depende de UM tipo de requisição (a imagem do tile), então é muito
 * mais resiliente como padrão.
 */
const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [{ id: "osm-raster-layer", type: "raster", source: "osm-raster" }],
};
const DEFAULT_ZOOM = 12;
/** São Paulo — só usado quando não há `initialCenter` nem `markers` (mapa vazio). */
const FALLBACK_CENTER: [number, number] = [-46.633309, -23.55052];
const DEFAULT_ROUTE_COLOR = "#3b6ef6";
const MARKER_COLOR = "#2563eb";
const ROUTE_SOURCE_ID = "rotta-route";
const ROUTE_LAYER_ID = "rotta-route-line";
const HEATMAP_SOURCE_ID = "rotta-heatmap";
const HEATMAP_LAYER_ID = "rotta-heatmap-layer";

/** Elemento DOM do ícone de veículo (`marker.emMovimento`) — ver `vehicle-icon.ts`. */
function buildVehicleMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = vehicleIconMarkup(MARKER_COLOR);
  el.style.cursor = "pointer";
  return el;
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
  markers,
  route,
  routeColor = DEFAULT_ROUTE_COLOR,
  heatmapPoints,
  initialCenter,
  initialZoom = DEFAULT_ZOOM,
  onBoundsChange,
  onMarkerPress,
  styleUrl,
}: RottaMapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
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

    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl ?? OSM_RASTER_STYLE,
      center: initialCenter ? [initialCenter.longitude, initialCenter.latitude] : FALLBACK_CENTER,
      zoom: initialZoom,
    });
    map.addControl(new NavigationControl(), "top-right");

    // Sem isso, uma falha ao carregar o estilo (URL errada, tile server
    // fora do ar) é silenciosa — o mapa fica com a tela preta padrão do
    // WebGL e nenhum erro aparece em lugar nenhum, exceto o console.
    map.on("error", (event) => {
      // eslint-disable-next-line no-console -- único sinal visível de uma falha de estilo/tile.
      console.error("[RottaMap] Falha ao carregar o mapa:", event.error);
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
    map.once("load", emitBounds);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setup roda só quando o estilo muda; ver refs acima para os callbacks.
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = markers.map((marker) => {
      const mapMarker = marker.emMovimento
        ? new Marker({ element: buildVehicleMarkerElement() })
        : new Marker({ color: MARKER_COLOR });
      mapMarker
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(new Popup({ offset: 24 }).setText(marker.titulo))
        .addTo(map);
      mapMarker.getElement().addEventListener("click", () => onMarkerPressRef.current?.(marker));
      return mapMarker;
    });

    if (!initialCenter && markers.length > 0) {
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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
