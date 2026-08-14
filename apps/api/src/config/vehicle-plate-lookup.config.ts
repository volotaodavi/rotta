import { registerAs } from "@nestjs/config";

export interface VehiclePlateLookupConfig {
  /** Base URL do provedor de consulta de placa — ex.: `https://api.provedor.com.br/v1/placas`. `GET {baseUrl}/{placa}` é a única forma de chamada suportada hoje (ver `VehiclePlateLookupService`). */
  baseUrl: string | undefined;
  apiKey: string | undefined;
}

/**
 * Configuração de um provedor de consulta de placa (briefing "CADASTRO
 * DE VEÍCULOS" — pedido do usuário: "as empresas... deverão colocar a
 * placa do veículo (pode buscar em todos os detrans, para a análise ser
 * rápida — se precisar, faça um agente de IA)"). Ver a nota completa em
 * `VehiclePlateLookupService` sobre por que não existe uma consulta
 * gratuita/oficial unificada de todos os 27 Detrans — `baseUrl`/`apiKey`
 * ficam `undefined` até uma empresa de dados veiculares (ex.: os mesmos
 * provedores usados por seguradoras — Sinesp Cidadão não é uma API
 * pública, e scraping de site de Detran violaria os termos de uso e
 * quebraria a qualquer redesign do site deles) ser contratada.
 */
export default registerAs("vehiclePlateLookup", (): VehiclePlateLookupConfig => ({
  baseUrl: process.env.VEHICLE_PLATE_LOOKUP_API_URL || undefined,
  apiKey: process.env.VEHICLE_PLATE_LOOKUP_API_KEY || undefined,
}));
