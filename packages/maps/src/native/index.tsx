import {
  Camera,
  Callout,
  LineLayer,
  MapView,
  PointAnnotation,
  ShapeSource,
} from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { RottaMapMarker, RottaMapProps } from "../types";
import type { MapViewRef } from "@maplibre/maplibre-react-native";
import type { Feature, LineString } from "geojson";

export type { RottaMapProps, RottaMapMarker, BoundingBox, Coordenada } from "../types";

/**
 * Estilo padrão do mapa — VETORIAL `liberty` da OpenFreeMap, sem
 * chave/token (ver o histórico completo em `../web/index.tsx`: a CARTO,
 * que era usada antes aqui, passou a exigir chave de API pra qualquer
 * tile — confirmado com `curl`, a imagem devolvida vem com "API KEY
 * REQUIRED" carimbado em cima, reproduzido pelo usuário direto no app
 * publicado). `mapStyle` aceita `string | object` (`MapView` do
 * `@maplibre/maplibre-react-native`), então passar só a URL do estilo
 * funciona igual à web — o próprio MapLibre resolve tiles/sprite/glyphs
 * (todos do mesmo domínio `tiles.openfreemap.org`, sem dependência
 * cruzada de outro provedor).
 */
const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_ZOOM = 12;
/** São Paulo — só usado quando não há `initialCenter` nem `markers` (mapa vazio). */
const FALLBACK_CENTER: [number, number] = [-46.633309, -23.55052];
const DEFAULT_ROUTE_COLOR = "#3b6ef6";
/**
 * Mesmo raciocínio do teto de espera da versão web (`../web/index.tsx`,
 * `MAP_LOAD_TIMEOUT_MS`) — o histórico de 3 incidentes reais de "mapa
 * não aparece, sem erro visível" (CDN exigindo chave, hotlink bloqueado,
 * estilo composto à mão) se aplica igual aqui: `onDidFailLoadingMap` nem
 * sempre dispara (a requisição pode só travar), então este timeout é a
 * rede de segurança final antes de mostrar um estado de falha pro
 * usuário em vez de deixar a tela em branco pra sempre.
 */
const MAP_LOAD_TIMEOUT_MS = 15_000;

/**
 * Mesmo princípio de `@rotta/maps/web` (`animateMarkerTo`) — desliza o
 * marcador de veículo suavemente entre duas posições de GPS
 * consecutivas em vez de saltar instantâneo, adaptando a duração ao
 * intervalo real entre atualizações (tipicamente ~3s, `use-gps.ts`).
 * Pedido do usuário: "diminuir o tempo de mostrar o veículo se
 * movendo... suave e contínuo até o encerramento da rota".
 */
const HIGH_FREQUENCY_UPDATE_THRESHOLD_MS = 400;
/** Teto do deslizamento — nunca demora mais que isto pra alcançar a posição real, mesmo após um hiato incomum (app em segundo plano, GPS instável). */
const MAX_VEHICLE_MOVE_ANIMATION_MS = 3000;

/**
 * Desliza a coordenada exibida de um marcador `emMovimento` de forma
 * contínua até `target`, em vez do salto instantâneo padrão do
 * `PointAnnotation` — ver documentação completa em `../web/index.tsx`
 * (`animateMarkerTo`), mesmo princípio adaptado pra um hook de React
 * (aqui não há um `Marker` imperativo pra empurrar posição direto,
 * então a interpolação vira estado que o `PointAnnotation` recebe via
 * `coordinate`).
 */
function useAnimatedVehicleCoordinate(target: [number, number]): [number, number] {
  const currentRef = useRef<[number, number]>(target);
  const lastUpdatedAtRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const elapsedSinceLastUpdate =
      lastUpdatedAtRef.current === undefined ? undefined : now - lastUpdatedAtRef.current;
    lastUpdatedAtRef.current = now;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const from = currentRef.current;
    const to = target;
    if (from[0] === to[0] && from[1] === to[1]) return;

    if (
      elapsedSinceLastUpdate === undefined ||
      elapsedSinceLastUpdate < HIGH_FREQUENCY_UPDATE_THRESHOLD_MS
    ) {
      currentRef.current = to;
      forceRender((n) => n + 1);
      return;
    }

    const durationMs = Math.min(elapsedSinceLastUpdate, MAX_VEHICLE_MOVE_ANIMATION_MS);
    const startedAt = now;
    const step = (): void => {
      const t = Math.min((Date.now() - startedAt) / durationMs, 1);
      currentRef.current = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
      forceRender((n) => n + 1);
      rafRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só à mudança real de coordenada; `currentRef`/`lastUpdatedAtRef` são lidos via ref, nunca disparam o efeito de novo sozinhos.
  }, [target[0], target[1]]);

  return currentRef.current;
}

/**
 * Anel de pulso do marcador de veículo (`marker.emMovimento`) — pedido
 * do usuário: "o veículo deve ter a funcionalidade de ficar em
 * movimento" (o círculo + símbolo de veículo em si já existia; isto
 * deixa visualmente óbvio que a posição está viva/atualizando, mesmo
 * padrão "ponto pulsante" de apps de rastreamento). `Animated.loop` com
 * `useNativeDriver: true` (só `scale`/`opacity`, animação roda na
 * thread nativa, nunca trava a UI). Mesma linguagem visual do anel CSS
 * da web (`vehicle-icon.ts`), só que com `Animated.View` puro — este
 * pacote deliberadamente não depende de `react-native-svg`.
 */
function VehiclePulseRing(): JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.vehiclePulseRing,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) },
          ],
        },
      ]}
    />
  );
}

/**
 * Marcador de veículo com deslizamento suave entre posições (ver
 * `useAnimatedVehicleCoordinate`) — extraído em componente próprio
 * porque um Hook só pode rodar dentro de um componente, e cada
 * marcador `emMovimento` precisa da sua própria animação
 * independente.
 */
function AnimatedVehicleAnnotation({
  marker,
  onPress,
}: {
  marker: RottaMapMarker;
  onPress: () => void;
}): JSX.Element {
  const [longitude, latitude] = useAnimatedVehicleCoordinate([marker.longitude, marker.latitude]);
  return (
    <PointAnnotation id={marker.id} coordinate={[longitude, latitude]} onSelected={onPress}>
      <View style={styles.vehicleMarkerWrap}>
        <VehiclePulseRing />
        <View style={styles.vehicleMarker}>
          <View style={styles.vehicleMarkerBody}>
            <View style={styles.vehicleMarkerWindow} />
            <View style={styles.vehicleMarkerWindow} />
          </View>
        </View>
      </View>
      <Callout title={marker.titulo} />
    </PointAnnotation>
  );
}

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

  /**
   * Mesmo padrão de `../web/index.tsx`: `retryToken` força o `<MapView>`
   * a remontar do zero (via `key` abaixo) quando o usuário toca "Tentar
   * novamente" — nunca deixa a pessoa presa numa tela de mapa quebrada
   * sem saída.
   */
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryToken, setRetryToken] = useState(0);
  const settledRef = useRef(false);
  const handleRetry = useCallback(() => {
    settledRef.current = false;
    setStatus("loading");
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    settledRef.current = false;
    setStatus("loading");
    const timeoutId = setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      setStatus("error");
    }, MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [styleUrl, retryToken]);

  const handleMapReady = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    setStatus("ready");
  }, []);
  const handleMapFailed = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    setStatus("error");
  }, []);

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
        key={retryToken}
        ref={mapRef}
        style={styles.map}
        mapStyle={styleUrl ?? DEFAULT_STYLE_URL}
        onDidFinishLoadingMap={handleMapReady}
        onDidFailLoadingMap={handleMapFailed}
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
        {markers.map((marker) =>
          marker.emMovimento ? (
            <AnimatedVehicleAnnotation
              key={marker.id}
              marker={marker}
              onPress={() => onMarkerPress?.(marker)}
            />
          ) : (
            <PointAnnotation
              key={marker.id}
              id={marker.id}
              coordinate={[marker.longitude, marker.latitude]}
              onSelected={() => onMarkerPress?.(marker)}
            >
              <View style={styles.marker} />
              <Callout title={marker.titulo} />
            </PointAnnotation>
          ),
        )}
      </MapView>
      {status === "error" ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>
            Não foi possível carregar o mapa agora. Verifique sua conexão e tente de novo.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleRetry}>
            <Text style={styles.errorButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: "#f8fafc",
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
    color: "#334155",
    maxWidth: 280,
  },
  errorButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#2563eb",
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
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
  // Container maior que o círculo do veículo (52 = 28 * 1.8, o `scale`
  // máximo de `VehiclePulseRing`) — o `PointAnnotation` centraliza a
  // coordenada no meio desta `View`, então o anel cresce simetricamente
  // sem deslocar a posição real do veículo no mapa.
  vehicleMarkerWrap: { alignItems: "center", height: 52, justifyContent: "center", width: 52 },
  vehiclePulseRing: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    height: 28,
    position: "absolute",
    width: 28,
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
