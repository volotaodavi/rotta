"use client";

import { LngLatBounds, MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { RottaMapProps } from "../types";

import "maplibre-gl/dist/maplibre-gl.css";

export type { RottaMapProps, RottaMapMarker, BoundingBox, Coordenada } from "../types";

/** OpenFreeMap (https://openfreemap.org) — hospedagem gratuita de tiles vetoriais OSM, sem token/conta/limite de uso. Estilo "dark", visualmente equivalente ao `mapbox://styles/mapbox/dark-v11` usado antes. */
const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/dark";
const DEFAULT_ZOOM = 12;
/** São Paulo — só usado quando não há `initialCenter` nem `markers` (mapa vazio). */
const FALLBACK_CENTER: [number, number] = [-46.633309, -23.55052];

/**
 * `<RottaMap />` (web) — único componente do app que importa
 * `maplibre-gl` diretamente (ver ADR em `../types.ts`). Renderiza os
 * marcadores já calculados pelo Map Intelligence Agent (`GET
 * /geo/mapa/marcadores`); NUNCA chama Nominatim/OSRM do navegador.
 */
export function RottaMap({
  markers,
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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
