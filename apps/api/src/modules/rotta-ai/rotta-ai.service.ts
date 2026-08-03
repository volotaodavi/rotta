import { Injectable, NotImplementedException } from "@nestjs/common";


import type { AnalyzeSchoolAddressDto } from "./dto/analyze-school-address.dto";
import type { AnalyzeVehicleDocumentDto } from "./dto/analyze-vehicle-document.dto";
import type { SchoolAddressAnalysisResponseDto } from "./dto/school-address-analysis-response.dto";
import type { ValidarContratoAssinadoDto } from "./dto/validar-contrato-assinado.dto";
import type { ValidateDocumentDto } from "./dto/validate-document.dto";

import { GeoEngineService } from "@/modules/geo/geo-engine.service";

const CEP_VALIDO = /^\d{5}-?\d{3}$/;

/**
 * Ponto de integração preparado para a Rotta AI (briefing: "Preparar
 * integração para validar automaticamente CNH, Selfie, Face Match, OCR,
 * EAR, Cursos"). Nenhum provedor de visão computacional/OCR foi
 * contratado ou especificado neste módulo — implementar um resultado
 * fake aqui seria pior do que declarar honestamente que a checagem
 * ainda não roda, já que times a jusante (Motoristas/Documentos) não
 * podem confiar em uma aprovação simulada como se fosse real.
 *
 * Contrato estabilizado desde já (`ValidateDocumentDto`/`RottaAiCheckType`)
 * para que o restante do sistema já possa ser escrito contra esta
 * interface; a troca para uma implementação real será, deliberadamente,
 * a troca do corpo deste único método.
 */
@Injectable()
export class RottaAiService {
  constructor(private readonly geoEngine: GeoEngineService) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateDocument(_dto: ValidateDocumentDto): Promise<never> {
    throw new NotImplementedException(
      "A validação automática via Rotta AI ainda não está disponível — integração pendente de um provedor de OCR/visão computacional.",
    );
  }

  /**
   * Mesmo estado (stub honesto) da análise de identidade acima, agora
   * para documentação de VEÍCULO (briefing "ROTTA AI" do módulo
   * Veículos — "analisar documentos, verificar qualidade, detectar
   * ilegibilidade/adulteração"). Contrato separado de `validateDocument`
   * porque o domínio é distinto (documento do veículo, não da pessoa) —
   * ver nota em `AnalyzeVehicleDocumentDto`. Chamado por
   * `VehiclesService` de forma best-effort logo após cada upload de
   * documento: o upload em si NUNCA fica bloqueado esperando esta
   * análise.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async analyzeVehicleDocument(_dto: AnalyzeVehicleDocumentDto): Promise<never> {
    throw new NotImplementedException(
      "A análise automática de documentos de veículo via Rotta AI ainda não está disponível — integração pendente de um provedor de OCR/visão computacional.",
    );
  }

  /**
   * ENDEREÇO de Escola (briefing "ROTTA AI" do módulo Escolas —
   * corrigir endereço/validar CEP/geocodificar/obter coordenadas) —
   * agora real: delega ao Rotta Geo Engine (briefing "ROTTA GEO
   * PLATFORM", Nominatim/OpenStreetMap). Chamado pelo front-end ANTES de
   * a escola existir (formulário de cadastro, `POST /rotta-ai/analyze-
   * school-address`) — por isso não grava `SchoolCoordinate` nem
   * atualiza nenhum `School` aqui; isso só acontece para escolas já
   * cadastradas, via `GeoPipelineService` (Geocoding AI Agent +
   * Validation AI Agent). Se o Nominatim/OSRM estiverem fora do ar, a
   * exceção de `GeoEngineService` propaga tal como está — o chamador
   * (formulário) trata como best-effort e segue sem coordenadas, nunca
   * bloqueia o cadastro.
   */
  async analyzeSchoolAddress(
    dto: AnalyzeSchoolAddressDto,
  ): Promise<SchoolAddressAnalysisResponseDto> {
    const cepValido = CEP_VALIDO.test(dto.cep);
    const endereco = dto.enderecoLivre ? `${dto.enderecoLivre}, ${dto.cep}` : dto.cep;
    const resultado = await this.geoEngine.geocode(endereco);

    return {
      cepValido,
      logradouroSugerido: resultado.logradouro ?? undefined,
      bairroSugerido: resultado.bairro ?? undefined,
      cidadeSugerida: resultado.cidade ?? undefined,
      estadoSugerido: resultado.estado ?? undefined,
      latitude: resultado.latitude,
      longitude: resultado.longitude,
    };
  }

  /**
   * Mesmo stub honesto, agora para a validação pós-assinatura do
   * CONTRATO (briefing "Marketplace" §"ROTTA AI" — "valida o contrato
   * assinado e ativa automaticamente o transporte"). Chamada por
   * `ContractsService` de forma best-effort assim que as DUAS
   * assinaturas (Responsável + Empresa) já estão presentes — mas,
   * diferente dos demais usos da Rotta AI neste módulo, a ATIVAÇÃO do
   * contrato em si NUNCA depende do resultado desta chamada: "ambas as
   * partes assinaram" é um fato que o próprio banco já garante com
   * certeza, sem precisar de nenhum provedor externo para confirmá-lo.
   * Esta validação é uma camada adicional (ex. detecção de fraude/
   * anomalia), best-effort, exatamente como `analyzeVehicleDocument`
   * nunca bloqueia o upload em si.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async validarContratoAssinado(_dto: ValidarContratoAssinadoDto): Promise<never> {
    throw new NotImplementedException(
      "A validação automática de contrato assinado via Rotta AI ainda não está disponível — integração pendente de um provedor de análise documental.",
    );
  }
}
