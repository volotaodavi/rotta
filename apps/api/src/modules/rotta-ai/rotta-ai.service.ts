import { BadRequestException, Injectable, NotImplementedException } from "@nestjs/common";


import type { AnalyzeSchoolAddressDto } from "./dto/analyze-school-address.dto";
import type { AnalyzeVehicleDocumentDto } from "./dto/analyze-vehicle-document.dto";
import type { SchoolAddressAnalysisResponseDto } from "./dto/school-address-analysis-response.dto";
import type { SuggestRouteOptimizationDto } from "./dto/suggest-route-optimization.dto";
import type { ValidarContratoAssinadoDto } from "./dto/validar-contrato-assinado.dto";
import type { ValidateDocumentResponseDto } from "./dto/validate-document-response.dto";
import type { ValidateDocumentDto } from "./dto/validate-document.dto";

import { DiditService } from "@/infra/didit/didit.service";
import { GeoEngineService } from "@/modules/geo/geo-engine.service";
import { Role } from "@/shared/enums";

const CEP_VALIDO = /^\d{5}-?\d{3}$/;

/** Tipos de check que são, eles próprios, um documento de identidade (não Selfie/FaceMatch/EAR/Curso). */
const IDENTITY_DOCUMENT_CHECK_TYPES = new Set(["CNH", "RG", "CIN", "PASSAPORTE"]);

/**
 * Ponto de integração da Rotta AI (briefing: "Preparar integração para
 * validar automaticamente CNH, Selfie, Face Match, OCR, EAR, Cursos").
 *
 * CNH/RG/CIN/PASSAPORTE/OCR: reais, via Didit (didit.me) — provedor de
 * verificação de identidade (`DiditService`). Mapeamento:
 *   - CNH/RG/CIN/PASSAPORTE/OCR → ID Verification (OCR + autenticidade
 *                do documento; a Didit reconhece qualquer um desses
 *                tipos, o mesmo endpoint `verifyId` serve para todos)
 *   - SELFIE   → Passive Liveness (confirma que é uma pessoa presente,
 *                não uma foto de foto/deepfake — não existe um check
 *                de "selfie" isolado na Didit; liveness é o
 *                equivalente real mais próximo)
 *   - FACE_MATCH → compara `referenciaArquivo` (selfie) com
 *                `referenciaArquivoComparacao` (retrato do documento)
 *
 * REGRA DE NEGÓCIO (papel do solicitante): Motorista só pode submeter
 * CNH como documento de identidade — RG/CIN/Passaporte são REJEITADOS
 * com 400 antes mesmo de chamar a Didit, porque só a CNH comprova a
 * habilitação de categoria D/E exigida para dirigir veículo escolar
 * (`DRV-02`, Dossiê 16 — "categoria mínima D é obrigatória para status
 * aprovado, mesmo com data de validade correta"). Qualquer outro papel
 * (Monitor, Despachante etc.) pode submeter CNH, RG, CIN ou Passaporte
 * livremente. Quando um Gestor/Empresa (papel administrativo) cadastra
 * o motorista em nome dele — "ajudante cadastrando o motorista" —, a
 * mesma regra vale: é o papel do TITULAR do documento (Motorista) que
 * importa, nunca o papel de quem está com a sessão ativa; por isso este
 * método recebe `documentoTitularRole` explícito em vez de inferir do
 * usuário autenticado (`@CurrentUser()`), que pode ser só o ajudante.
 *
 * EAR/CURSO permanecem stub honesto: não são documentos de identidade
 * reconhecidos mundialmente (catálogo da Didit é CNH/RG/passaporte/etc,
 * não certificados específicos do DETRAN ou de cursos) — implementar um
 * resultado fake aqui seria pior do que declarar honestamente que a
 * checagem ainda não roda.
 */
@Injectable()
export class RottaAiService {
  constructor(
    private readonly geoEngine: GeoEngineService,
    private readonly diditService: DiditService,
  ) {}

  async validateDocument(
    dto: ValidateDocumentDto,
    documentoTitularRole?: Role,
  ): Promise<ValidateDocumentResponseDto> {
    if (
      documentoTitularRole === Role.MOTORISTA &&
      IDENTITY_DOCUMENT_CHECK_TYPES.has(dto.tipo) &&
      dto.tipo !== "CNH"
    ) {
      throw new BadRequestException(
        `Motoristas só podem enviar CNH como documento de identidade — ${dto.tipo} não é aceito, porque só a CNH comprova a categoria de habilitação exigida para dirigir veículo escolar.`,
      );
    }

    switch (dto.tipo) {
      case "CNH":
      case "RG":
      case "CIN":
      case "PASSAPORTE":
      case "OCR": {
        const resultado = await this.diditService.verifyId(dto.referenciaArquivo);
        return {
          aprovado: resultado.aprovado,
          status: resultado.status,
          provedor: "didit",
          tipoDocumento: resultado.tipoDocumento,
          dadosBrutos: resultado.dadosBrutos,
        };
      }
      case "SELFIE": {
        const resultado = await this.diditService.passiveLiveness(dto.referenciaArquivo);
        return {
          aprovado: resultado.aprovado,
          status: resultado.status,
          provedor: "didit",
          dadosBrutos: resultado.dadosBrutos,
        };
      }
      case "FACE_MATCH": {
        if (!dto.referenciaArquivoComparacao) {
          throw new BadRequestException(
            "FACE_MATCH exige referenciaArquivoComparacao (a foto do documento a comparar com a selfie).",
          );
        }
        const resultado = await this.diditService.faceMatch(
          dto.referenciaArquivo,
          dto.referenciaArquivoComparacao,
        );
        return {
          aprovado: resultado.aprovado,
          status: resultado.status,
          provedor: "didit",
          scoreFaceMatch: resultado.score,
          dadosBrutos: resultado.dadosBrutos,
        };
      }
      case "EAR":
      case "CURSO":
        throw new NotImplementedException(
          `A validação automática de ${dto.tipo} ainda não está disponível — não é um documento de identidade do catálogo da Didit, precisa de um provedor específico (ex. OCR genérico + validação manual).`,
        );
    }
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

  /**
   * Rotta Route AI — otimização automática de sequência de paradas
   * (ROT-08). Mesmo estado (stub honesto) dos demais métodos deste
   * serviço: ROT-08 é explicitamente V2 na própria Especificação
   * Funcional (Dossiê 3 §12.8) — precisaria de um provedor de rotas
   * (Google Directions/OSRM, Dossiê 9 §2.6) capaz de calcular a
   * sequência de menor tempo/distância total entre as paradas já
   * cadastradas, mantendo fixos os pontos de origem/destino
   * obrigatórios. Implementar um resultado fake aqui seria pior do que
   * declarar honestamente que a sugestão ainda não está disponível —
   * a rota atual nunca é alterada quando este método falha (regra de
   * negócio de ROT-08: "a sugestão nunca altera a rota
   * automaticamente"), então o chamador (`RoutesService`, quando
   * existir) trata esta exceção como best-effort, exatamente como
   * `analyzeVehicleDocument`.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async suggestRouteOptimization(_dto: SuggestRouteOptimizationDto): Promise<never> {
    throw new NotImplementedException(
      "A otimização automática de rota ainda não está disponível — integração pendente de um provedor de cálculo de trajeto (Google Directions/OSRM).",
    );
  }
}
