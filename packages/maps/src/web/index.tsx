"use client";

import {
  LngLatBounds,
  MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { Coordenada, RottaMapProps } from "../types";
import type { Feature, LineString } from "geojson";

import "maplibre-gl/dist/maplibre-gl.css";

export type { RottaMapProps, RottaMapMarker, BoundingBox, Coordenada } from "../types";

/**
 * OpenFreeMap (https://openfreemap.org) — hospedagem gratuita de tiles
 * vetoriais OSM, sem token/conta/limite de uso. Os únicos estilos
 * publicados por eles são `liberty`, `bright` e `positron` — NÃO existe
 * `dark` (o valor usado aqui antes apontava para uma URL 404, e o mapa
 * ficava completamente preto: MapLibre GL não tem nenhum layer/cor de
 * fundo para pintar quando o carregamento do estilo falha). `liberty` é
 * o estilo mais completo/atual deles (equivalente ao OSM Liberty).
 */
const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_ZOOM = 12;
/** São Paulo — só usado quando não há `initialCenter` nem `markers` (mapa vazio). */
const FALLBACK_CENTER: [number, number] = [-46.633309, -23.55052];
const DEFAULT_ROUTE_COLOR = "#3b6ef6";
const ROUTE_SOURCE_ID = "rotta-route";
const ROUTE_LAYER_ID = "rotta-route-line";

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
  initialCenter,
  initialZoom = DEFAULT_ZOOM,
  onBoundsChange,
  onMarkerPress,
  styleUrl = DEFAULT_STYLE,
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
      style: styleUrl,
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
      const mapMarker = new Marker({ color: "#2563eb" })
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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
