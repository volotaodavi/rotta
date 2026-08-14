import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { VehiclePlateLookupConfig } from "@/config/vehicle-plate-lookup.config";

const TIMEOUT_MS = 8_000;

/** Dados encontrados pra uma placa — todos opcionais porque nem todo provedor devolve todos os campos. */
export interface VehiclePlateLookupResult {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
}

/**
 * Busca de veículo por placa (briefing "CADASTRO DE VEÍCULOS" — pedido
 * do usuário: "as empresas... deverão colocar a placa do veículo (pode
 * buscar em todos os detrans, para a análise ser rápida — se precisar,
 * faça um agente de IA)").
 *
 * NÃO EXISTE uma API oficial, gratuita e unificada dos 27 Detrans
 * brasileiros — o Sinesp Cidadão é um APP, não uma API pública
 * documentada; "raspar" (web scraping) o site de cada Detran violaria
 * os Termos de Uso deles, quebraria a cada redesign, e não teria como
 * ser verificado funcionando de dentro deste ambiente sandbox (sem
 * acesso à internet real). Implementar isso com dados inventados seria
 * pior que não ter a funcionalidade — mesma disciplina já usada em
 * `AuthentiqueService`/`RottaAiService` antes de terem credenciais
 * reais.
 *
 * O que existe de verdade: uma dezena de empresas de dados veiculares
 * (as mesmas que seguradoras usam pra cotação — ex. bases da própria
 * Denatran licenciadas via parceiros comerciais) vendem exatamente essa
 * consulta via API REST com API key. Este serviço já é o "agente" que
 * consulta esse provedor assim que a Rotta contratar um
 * (`VEHICLE_PLATE_LOOKUP_API_URL`/`VEHICLE_PLATE_LOOKUP_API_KEY`) — sem
 * as duas variáveis configuradas, ele recusa a chamada com um erro
 * claro (nunca inventa marca/modelo/ano/cor).
 */
@Injectable()
export class VehiclePlateLookupService {
  private readonly logger = new Logger(VehiclePlateLookupService.name);
  private readonly config: VehiclePlateLookupConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<VehiclePlateLookupConfig>("vehiclePlateLookup")!;
  }

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.config.apiKey);
  }

  /** @throws ServiceUnavailableException Nenhum provedor configurado neste ambiente. */
  async lookup(placa: string): Promise<VehiclePlateLookupResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "Busca automática de veículo por placa não está configurada neste ambiente " +
          "(VEHICLE_PLATE_LOOKUP_API_URL/VEHICLE_PLATE_LOOKUP_API_KEY ausentes). " +
          "Preencha os dados do veículo manualmente.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/${encodeURIComponent(placa)}`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        signal: controller.signal,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar a placa ${placa} no provedor configurado: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException(
        "Não foi possível consultar a placa agora. Tente novamente em instantes.",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      this.logger.warn(`Provedor de placa respondeu HTTP ${response.status} para ${placa}.`);
      throw new ServiceUnavailableException(
        "Não foi possível consultar a placa agora. Tente novamente em instantes.",
      );
    }

    const data = (await response.json()) as Partial<VehiclePlateLookupResult>;
    return {
      marca: data.marca ?? null,
      modelo: data.modelo ?? null,
      ano: data.ano ?? null,
      cor: data.cor ?? null,
    };
  }
}
