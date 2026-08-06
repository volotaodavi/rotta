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

/**
 * Tiles RASTER puros do OpenStreetMap (tile.openstreetmap.org) — troca
 * o estilo VETORIAL `liberty` do OpenFreeMap (ver nota equivalente e
 * mais detalhada em `../web/index.tsx`: um estilo vetorial depende de
 * vários fetches extras — style.json, sprite, glyphs — que podem falhar
 * silenciosamente e deixar o mapa em branco; um raster puro só depende
 * da imagem do tile em si). `mapStyle` aceita `string | object`
 * (`MapView` do `@maplibre/maplibre-react-native`), então o mesmo
 * objeto de estilo inline funciona aqui igual à web.
 */
const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm-raster-layer", type: "raster", source: "osm-raster" }],
};
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
  styleUrl,
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
        mapStyle={styleUrl ?? OSM_RASTER_STYLE}
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
            {marker.emMovimento ? (
              <View style={styles.vehicleMarker}>
                <View style={styles.vehicleMarkerBody}>
                  <View style={styles.vehicleMarkerWindow} />
                  <View style={styles.vehicleMarkerWindow} />
                </View>
              </View>
            ) : (
              <View style={styles.marker} />
            )}
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
  // Ícone de veículo (marker.emMovimento) — mesma linguagem visual do SVG
  // web (`vehicle-icon.ts`), só que com Views puras (sem dependência de
  // react-native-svg, ainda não usada neste pacote).
  vehicleMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleMarkerBody: {
    width: 14,
    height: 18,
    borderRadius: 3,
    backgroundColor: "#ffffff",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 2,
  },
  vehicleMarkerWindow: {
    width: 10,
    height: 4,
    borderRadius: 1,
    backgroundColor: "#2563eb",
  },
});
