import Mapbox from "@rnmapbox/maps";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import type { RottaMapProps } from "../types";
import type { MapView as MapboxMapView } from "@rnmapbox/maps";

export type { RottaMapProps, RottaMapMarker, BoundingBox, Coordenada } from "../types";

const DEFAULT_STYLE = Mapbox.StyleURL.Dark;
const DEFAULT_ZOOM = 12;
/** São Paulo — só usado quando não há `initialCenter` nem `markers` (mapa vazio). */
const FALLBACK_CENTER: [number, number] = [-46.633309, -23.55052];

/**
 * `<RottaMap />` (mobile/native) — único componente do app que importa
 * `@rnmapbox/maps` diretamente (ver ADR em `../types.ts`). Renderiza os
 * marcadores já calculados pelo Map Intelligence Agent (`GET
 * /geo/mapa/marcadores`); NUNCA chama o Mapbox Geocoding/Directions API
 * do dispositivo.
 *
 * Requer o config plugin `@rnmapbox/maps` registrado em
 * `apps/mobile/app.config.ts` e um build nativo (dev client/EAS) — NÃO
 * funciona no app Expo Go (módulo nativo). Fixado em `^10.2.x` (não a
 * major mais recente, `10.3.x`, que exige React Native >=0.79 — este
 * monorepo está em RN 0.76.5/Expo SDK 52; revisitar quando o projeto
 * atualizar o Expo SDK).
 */
export function RottaMap({
  accessToken,
  markers,
  initialCenter,
  initialZoom = DEFAULT_ZOOM,
  onBoundsChange,
  onMarkerPress,
  styleUrl = DEFAULT_STYLE,
}: RottaMapProps): JSX.Element {
  const mapRef = useRef<MapboxMapView>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  useEffect(() => {
    Mapbox.setAccessToken(accessToken);
  }, [accessToken]);

  const center = initialCenter
    ? ([initialCenter.longitude, initialCenter.latitude] as [number, number])
    : markers.length > 0
      ? ([markers[0]!.longitude, markers[0]!.latitude] as [number, number])
      : FALLBACK_CENTER;

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={styleUrl}
        onMapIdle={async () => {
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
        <Mapbox.Camera defaultSettings={{ centerCoordinate: center, zoomLevel: initialZoom }} />
        {markers.map((marker) => (
          <Mapbox.PointAnnotation
            key={marker.id}
            id={marker.id}
            coordinate={[marker.longitude, marker.latitude]}
            onSelected={() => onMarkerPress?.(marker)}
          >
            <View style={styles.marker} />
            <Mapbox.Callout title={marker.titulo} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>
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
