import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  Coordenada,
  DirectionsResult,
  GeocodeResult,
  ReverseGeocodeResult,
} from "./geo-engine.types";
import type { GeoConfig } from "@/config/geo.config";

/** Nome completo (como o Nominatim devolve em `address.state`) → UF, para bater com `School.estado` (sempre a sigla, ex. `"SP"`). */
const UF_POR_ESTADO: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapá: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceará: "CE",
  "distrito federal": "DF",
  "espírito santo": "ES",
  goiás: "GO",
  maranhão: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  pará: "PA",
  paraíba: "PB",
  paraná: "PR",
  pernambuco: "PE",
  piauí: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondônia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "são paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  /** Presente para entidades administrativas nível 4 (estado) — ex. `"BR-SP"`, já na sigla. Quando ausente, cai para `estadoParaUf(state)`. */
  "ISO3166-2-lvl4"?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  /** 0 a 1 — papel equivalente ao `relevance` que o Mapbox Geocoding API devolvia. */
  importance: number;
  address?: NominatimAddress;
}

/** `"BR-SP"` → `"SP"`; nome completo (`"São Paulo"`) → `"SP"` via `UF_POR_ESTADO`. Nunca lança — retorna `null` quando o Nominatim não devolve nada reconhecível (endereço rural sem `address.state`, por exemplo). */
function ufFromAddress(address: NominatimAddress | undefined): string | null {
  if (!address) return null;
  const iso = address["ISO3166-2-lvl4"];
  if (iso?.startsWith("BR-")) return iso.slice(3);
  if (!address.state) return null;
  return UF_POR_ESTADO[address.state.toLowerCase()] ?? null;
}

function cidadeFromAddress(address: NominatimAddress | undefined): string | null {
  return address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? null;
}

function bairroFromAddress(address: NominatimAddress | undefined): string | null {
  return address?.suburb ?? address?.neighbourhood ?? null;
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: unknown;
}

interface OsrmRouteResponse {
  code: string;
  /** Ausente quando `code !== "Ok"` (ex. `"NoRoute"`) — nunca assumir presente. */
  routes?: OsrmRoute[];
}

/**
 * Rotta Geo Engine (briefing "ROTTA GEO PLATFORM" §"ROTTA GEO ENGINE")
 * — único ponto do sistema que conhece o provedor de mapas/geocodificação
 * (OpenStreetMap: Nominatim para geocodificação, OSRM para rotas —
 * substituiu o Mapbox, mesmo contrato estável em `geo-engine.types.ts`
 * para o resto do sistema nunca perceber a troca). Nenhum outro módulo
 * pode chamar `fetch` para Nominatim/OSRM diretamente; todos passam por
 * aqui.
 *
 * DIVULGAÇÃO HONESTA (mesma disciplina de `SupabaseStorageService`/
 * `InepSyncService`): os endereços padrão (`NOMINATIM_BASE_URL`/
 * `OSRM_BASE_URL`) apontam para as instâncias públicas e gratuitas
 * mantidas pela comunidade OSM — funcionam sem nenhuma configuração
 * (nenhum token, ao contrário do Mapbox), mas têm política de uso
 * pesada para produção em escala nacional: Nominatim pede no máximo
 * ~1 requisição/segundo e exige um `User-Agent` identificando a
 * aplicação (`NOMINATIM_USER_AGENT`, com um default aqui mas
 * sobrescrevível); o OSRM demo público não tem SLA nem garantia de
 * disponibilidade. Para volume nacional real (~200 mil escolas), a
 * recomendação é hospedar as próprias instâncias (Nominatim/OSRM são
 * open-source, rodáveis em Docker) e apontar `NOMINATIM_BASE_URL`/
 * `OSRM_BASE_URL` para elas — o `SchoolGeocodeProcessor` já limita a
 * concorrência da fila de geocodificação para respeitar o rate limit
 * público por padrão.
 */
@Injectable()
export class GeoEngineService {
  private readonly config: GeoConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<GeoConfig>("geo")!;
  }

  private nominatimHeaders(): Record<string, string> {
    return { "User-Agent": this.config.nominatimUserAgent };
  }

  /** Endereço → coordenadas (Nominatim `/search`). Lança se o endereço não retornar nenhum resultado. */
  async geocode(endereco: string): Promise<GeocodeResult> {
    const url = `${this.config.nominatimBaseUrl}/search?q=${encodeURIComponent(endereco)}&format=jsonv2&addressdetails=1&countrycodes=br&limit=1`;

    const response = await fetch(url, { headers: this.nominatimHeaders() });
    if (!response.ok) {
      throw new BadGatewayException(
        `Rotta Geo Engine: falha ao geocodificar endereço (Nominatim retornou ${response.status}).`,
      );
    }

    const body = (await response.json()) as NominatimResult[];
    const resultado = body[0];
    if (!resultado) {
      throw new BadGatewayException(
        "Rotta Geo Engine: nenhuma coordenada encontrada para o endereço informado.",
      );
    }

    return {
      latitude: Number(resultado.lat),
      longitude: Number(resultado.lon),
      precisao: resultado.importance.toFixed(2),
      enderecoFormatado: resultado.display_name,
      logradouro: resultado.address?.road ?? null,
      bairro: bairroFromAddress(resultado.address),
      cidade: cidadeFromAddress(resultado.address),
      estado: ufFromAddress(resultado.address),
    };
  }

  /** Coordenadas → endereço/cidade/estado (Nominatim `/reverse`) — usado pelo Validation AI Agent para conferir a geocodificação de forma independente. */
  async reverseGeocode(ponto: Coordenada): Promise<ReverseGeocodeResult> {
    const url = `${this.config.nominatimBaseUrl}/reverse?lat=${ponto.latitude}&lon=${ponto.longitude}&format=jsonv2&addressdetails=1`;

    const response = await fetch(url, { headers: this.nominatimHeaders() });
    if (!response.ok) {
      throw new BadGatewayException(
        `Rotta Geo Engine: falha ao geocodificar coordenada reversa (Nominatim retornou ${response.status}).`,
      );
    }

    const body = (await response.json()) as NominatimResult;
    if (!body.address) {
      throw new BadGatewayException(
        "Rotta Geo Engine: nenhum endereço encontrado para a coordenada informada.",
      );
    }

    return {
      cidade: cidadeFromAddress(body.address),
      estado: ufFromAddress(body.address),
      enderecoFormatado: body.display_name,
    };
  }

  /** Traçado/ETA/distância entre dois pontos, com paradas intermediárias opcionais (OSRM `/route`). */
  async getRoute(
    origem: Coordenada,
    destino: Coordenada,
    paradas: Coordenada[] = [],
  ): Promise<DirectionsResult> {
    const pontos = [origem, ...paradas, destino]
      .map((ponto) => `${ponto.longitude},${ponto.latitude}`)
      .join(";");
    const url = `${this.config.osrmBaseUrl}/route/v1/driving/${pontos}?geometries=geojson&overview=full`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException(
        `Rotta Geo Engine: falha ao calcular rota (OSRM retornou ${response.status}).`,
      );
    }

    const body = (await response.json()) as OsrmRouteResponse;
    const route = body.routes?.[0];
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
