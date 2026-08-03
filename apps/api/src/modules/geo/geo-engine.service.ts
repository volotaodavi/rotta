import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  Coordenada,
  DirectionsResult,
  GeocodeResult,
  ReverseGeocodeResult,
} from "./geo-engine.types";
import type { GeoConfig } from "@/config/geo.config";

const GEOCODING_BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const DIRECTIONS_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving";

interface MapboxContextEntry {
  id: string;
  text: string;
  /** Só presente em `region.*` — ex. `"BR-SP"`. `School.estado` guarda a UF (`"SP"`), nunca o nome completo. */
  short_code?: string;
}

interface MapboxGeocodingFeature {
  center: [number, number];
  place_name: string;
  relevance: number;
  /** Só presente quando a feature é do tipo `address` — nome da rua, sem o número. */
  text?: string;
  context?: MapboxContextEntry[];
}

interface MapboxGeocodingResponse {
  features: MapboxGeocodingFeature[];
}

function findContext(feature: MapboxGeocodingFeature, prefixo: string): MapboxContextEntry | null {
  return feature.context?.find((entry) => entry.id.startsWith(`${prefixo}.`)) ?? null;
}

/** `"BR-SP"` → `"SP"` — `short_code` do Mapbox sempre vem prefixado pelo país. */
function ufFromShortCode(shortCode: string | undefined): string | null {
  if (!shortCode) return null;
  const partes = shortCode.split("-");
  return partes[partes.length - 1]?.toUpperCase() ?? null;
}

interface MapboxDirectionsRoute {
  distance: number;
  duration: number;
  geometry: unknown;
}

interface MapboxDirectionsResponse {
  code: string;
  routes: MapboxDirectionsRoute[];
}

/**
 * Rotta Geo Engine (briefing "ROTTA GEO PLATFORM" §"ROTTA GEO ENGINE")
 * — único ponto do sistema que conhece o Mapbox (Geocoding API/
 * Directions API). Nenhum outro módulo pode chamar `fetch` para
 * `api.mapbox.com` diretamente; todos passam por aqui. Mesma disciplina
 * de `SupabaseStorageService`: constrói a chamada de forma "preguiçosa"
 * (o token só é lido quando um método é realmente chamado) para que a
 * aplicação suba normalmente mesmo sem `MAPBOX_ACCESS_TOKEN`
 * configurado — o erro só aparece se uma geocodificação/rota for de
 * fato tentada, nunca no boot.
 */
@Injectable()
export class GeoEngineService {
  private readonly config: GeoConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<GeoConfig>("geo")!;
  }

  private getToken(): string {
    if (!this.config.mapboxAccessToken) {
      throw new ServiceUnavailableException(
        "Rotta Geo Engine não configurado neste ambiente (MAPBOX_ACCESS_TOKEN ausente).",
      );
    }
    return this.config.mapboxAccessToken;
  }

  /** Endereço → coordenadas (Mapbox Geocoding API). Lança se o endereço não retornar nenhum resultado. */
  async geocode(endereco: string): Promise<GeocodeResult> {
    const token = this.getToken();
    const url = `${GEOCODING_BASE_URL}/${encodeURIComponent(endereco)}.json?access_token=${token}&limit=1&country=BR`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException(
        `Rotta Geo Engine: falha ao geocodificar endereço (Mapbox retornou ${response.status}).`,
      );
    }

    const body = (await response.json()) as MapboxGeocodingResponse;
    const feature = body.features[0];
    if (!feature) {
      throw new BadGatewayException(
        "Rotta Geo Engine: nenhuma coordenada encontrada para o endereço informado.",
      );
    }

    const [longitude, latitude] = feature.center;
    const regiao = findContext(feature, "region");
    return {
      latitude,
      longitude,
      precisao: feature.relevance.toFixed(2),
      enderecoFormatado: feature.place_name,
      logradouro: feature.text ?? null,
      bairro: findContext(feature, "neighborhood")?.text ?? null,
      cidade: findContext(feature, "place")?.text ?? null,
      estado: ufFromShortCode(regiao?.short_code) ?? regiao?.text ?? null,
    };
  }

  /** Coordenadas → endereço/cidade/estado (Mapbox Geocoding API, modo reverso) — usado pelo Validation AI Agent para conferir a geocodificação de forma independente. */
  async reverseGeocode(ponto: Coordenada): Promise<ReverseGeocodeResult> {
    const token = this.getToken();
    const url = `${GEOCODING_BASE_URL}/${ponto.longitude},${ponto.latitude}.json?access_token=${token}&types=address&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException(
        `Rotta Geo Engine: falha ao geocodificar coordenada reversa (Mapbox retornou ${response.status}).`,
      );
    }

    const body = (await response.json()) as MapboxGeocodingResponse;
    const feature = body.features[0];
    if (!feature) {
      throw new BadGatewayException(
        "Rotta Geo Engine: nenhum endereço encontrado para a coordenada informada.",
      );
    }

    const regiao = findContext(feature, "region");
    return {
      cidade: findContext(feature, "place")?.text ?? null,
      estado: ufFromShortCode(regiao?.short_code) ?? regiao?.text ?? null,
      enderecoFormatado: feature.place_name,
    };
  }

  /** Traçado/ETA/distância entre dois pontos, com paradas intermediárias opcionais (Mapbox Directions API). */
  async getRoute(
    origem: Coordenada,
    destino: Coordenada,
    paradas: Coordenada[] = [],
  ): Promise<DirectionsResult> {
    const token = this.getToken();
    const pontos = [origem, ...paradas, destino]
      .map((ponto) => `${ponto.longitude},${ponto.latitude}`)
      .join(";");
    const url = `${DIRECTIONS_BASE_URL}/${pontos}?access_token=${token}&geometries=geojson&overview=full`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException(
        `Rotta Geo Engine: falha ao calcular rota (Mapbox retornou ${response.status}).`,
      );
    }

    const body = (await response.json()) as MapboxDirectionsResponse;
    const route = body.routes[0];
    if (!route) {
      throw new BadGatewayException(
        "Rotta Geo Engine: nenhuma rota encontrada entre os pontos informados.",
      );
    }

    return {
      distanciaMetros: route.distance,
      duracaoSegundos: route.duration,
      geometria: route.geometry,
    };
  }
}
