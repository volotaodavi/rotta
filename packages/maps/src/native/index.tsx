import {
  Camera,
  Callout,
  LineLayer,
  MapView,
  PointAnnotation,
  ShapeSource,
} from "@maplibre/maplibre-react-native";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";

import type { RottaMapProps } from "../types";
import type { MapViewRef } from "@maplibre/maplibre-react-native";
import type { Feature, LineString } from "geojson";

export type { RottaMapProps, RottaMapMarker, BoundingBox, Coordenada } from "../types";

/** OpenFreeMap (https://openfreemap.org) — hospedagem gratuita de tiles vetoriais OSM, sem token/conta/limite de uso. Estilo "dark", visualmente equivalente ao estilo escuro do Mapbox usado antes. */
const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/dark";
const DEFAULT_ZOOM = 12;
/** São Paulo — só usado quando não há `initialCenter` nem `markers` (mapa vazio). */
const FALLBACK_CENTER: [number, number] = [-46.633309, -23.55052];
const DEFAULT_ROUTE_COLOR = "#3b6ef6";

/**
 * `<RottaMap />` (mobile/native) — único componente do app que importa
 * `@maplibre/maplibre-react-native` diretamente (ver ADR em
 * `../types.ts`). Renderiza os marcadores já calculados pelo Map
 * Intelligence Agent (`GET /geo/mapa/marcadores`); NUNCA chama
 * Nominatim/OSRM do dispositivo. `route` (opcional) desenha uma linha
 * estática por cima do mapa via `ShapeSource`/`LineLayer` — mesmo uso
 * de `./web`.
 *
 * Requer o config plugin `@maplibre/maplibre-react-native` registrado
 * em `apps/mobile/app.config.ts` e um build nativo (dev client/EAS) —
 * NÃO funciona no app Expo Go (módulo nativo). Ao contrário do
 * `@rnmapbox/maps` que este pacote usava antes, o MapLibre Native é
 * inteiramente open-source: nenhum token de download é necessário em
 * build-time (SDK distribuído via Maven Central/CocoaPods livremente).
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
  const mapRef = useRef<MapViewRef>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const center = initialCenter
    ? ([initialCenter.longitude, initialCenter.latitude] as [number, number])
    : markers.length > 0
      ? ([markers[0]!.longitude, markers[0]!.latitude] as [number, number])
      : FALLBACK_CENTER;

  const routeShape: Feature<LineString> | null = route
    ? {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: route.map((c) => [c.longitude, c.latitude]) },
      }
    : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={styleUrl}
        onRegionDidChange={async () => {
          if (!onBoundsChangeRef.current || !mapRef.current) return;
          const [ne, sw] = await mapRef.current.getVisibleBounds();
          onBoundsChangeRef.current({
            swLat: sw[1]!,
            swLng: sw[0]!,
            neLat: ne[1]!,
            neLng: ne[0]!,
          });
        }}
      >
        <Camera defaultSettings={{ centerCoordinate: center, zoomLevel: initialZoom }} />
        {routeShape ? (
          <ShapeSource id="rotta-route" shape={routeShape}>
            <LineLayer
              id="rotta-route-line"
              style={{ lineColor: routeColor, lineWidth: 4, lineCap: "round", lineJoin: "round" }}
            />
          </ShapeSource>
        ) : null}
        {markers.map((marker) => (
          <PointAnnotation
            key={marker.id}
            id={marker.id}
            coordinate={[marker.longitude, marker.latitude]}
            onSelected={() => onMarkerPress?.(marker)}
          >
            <View style={styles.marker} />
            <Callout title={marker.titulo} />
          </PointAnnotation>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
