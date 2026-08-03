import { Injectable, NotImplementedException } from "@nestjs/common";

import type { AnalyzeSchoolAddressDto } from "./dto/analyze-school-address.dto";
import type { AnalyzeVehicleDocumentDto } from "./dto/analyze-vehicle-document.dto";
import type { ValidateDocumentDto } from "./dto/validate-document.dto";

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
   * Mesmo stub honesto, agora para ENDEREÇO de Escola (briefing "ROTTA
   * AI" do módulo Escolas — corrigir endereço/validar CEP/geocodificar/
   * obter coordenadas). `SchoolsService` chama isto de forma
   * best-effort ao cadastrar/editar uma escola sem lat/long: se
   * indisponível (sempre, hoje), o cadastro segue normalmente sem
   * coordenadas — nunca bloqueia o fluxo. Detecção de escolas
   * duplicadas é diferente: NÃO depende de provedor externo, por isso
   * é implementada de verdade em `SchoolsService.checkPossibleDuplicates`,
   * não aqui.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async analyzeSchoolAddress(_dto: AnalyzeSchoolAddressDto): Promise<never> {
    throw new NotImplementedException(
      "A geocodificação/validação automática de endereço via Rotta AI ainda não está disponível — integração pendente de um provedor de geocodificação (ex. ViaCEP/Google Maps/Mapbox).",
    );
  }
}
