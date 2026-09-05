import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";

import {
  detectDriverDocumentFields,
  detectVehicleDocumentFields,
} from "./document-field-detection.util";

import type { AnalyzeDriverDocumentDto } from "./dto/analyze-driver-document.dto";
import type { AnalyzeSchoolAddressDto } from "./dto/analyze-school-address.dto";
import type { AnalyzeVehicleDocumentDto } from "./dto/analyze-vehicle-document.dto";
import type { ContractSignatureValidationResponseDto } from "./dto/contract-signature-validation-response.dto";
import type { RouteOptimizationResponseDto } from "./dto/route-optimization-response.dto";
import type { SchoolAddressAnalysisResponseDto } from "./dto/school-address-analysis-response.dto";
import type { SuggestRouteOptimizationDto } from "./dto/suggest-route-optimization.dto";
import type { ValidarContratoAssinadoDto } from "./dto/validar-contrato-assinado.dto";
import type { ValidateDocumentResponseDto } from "./dto/validate-document-response.dto";
import type { ValidateDocumentDto } from "./dto/validate-document.dto";
import type { VehicleDocumentAnalysisResponseDto } from "./dto/vehicle-document-analysis-response.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { readImageMetadata } from "@/common/utils/image-metadata.util";
import { extractTextFromImage } from "@/common/utils/ocr.util";
import { PrismaService } from "@/infra/database/prisma.service";
import { DiditService } from "@/infra/didit/didit.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { GeoEngineService } from "@/modules/geo/geo-engine.service";
import { Role } from "@/shared/enums";

/** Resolução mínima para considerar o texto de um documento legível a olho nu — abaixo disso, letras pequenas (RENAVAM, placa, datas) tendem a virar borrão. Limiar conservador, não uma norma técnica formal. */
const LARGURA_MINIMA_PX = 800;
const ALTURA_MINIMA_PX = 600;

const CEP_VALIDO = /^\d{5}-?\d{3}$/;

/** Abaixo deste intervalo entre a geração do contrato e uma assinatura, o tempo é curto demais pra ter lido o conteúdo — sinal de anomalia em `validarContratoAssinado` (Frente I), não uma regra formal/legal. */
const SIGNATURE_TOO_FAST_SECONDS = 3;

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
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
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
   * Documentação de VEÍCULO (briefing "ROTTA AI" do módulo Veículos —
   * "analisar documentos, verificar qualidade, detectar
   * ilegibilidade/adulteração"). Contrato separado de
   * `validateDocument` porque o domínio é distinto (documento do
   * veículo, não da pessoa) — ver nota em `AnalyzeVehicleDocumentDto`.
   * Chamado por `VehiclesService` de forma best-effort logo após cada
   * upload de documento: o upload em si NUNCA fica bloqueado esperando
   * esta análise.
   *
   * ESCOPO REAL: formato + resolução da imagem, lidos direto dos bytes
   * do arquivo (`readImageMetadata` — Frente E), MAIS, desde a Frente G,
   * OCR real via Tesseract.js (`ocr.util.ts`, self-hosted, sem provedor
   * pago) checando se RENAVAM/placa/palavras esperadas do tipo de
   * documento aparecem no texto lido (`document-field-detection.
   * util.ts`). Isso responde de verdade a "verificar qualidade das
   * imagens, detectar documentos ilegíveis" E cobre boa parte de
   * "detectar campo ausente" — mas ainda NÃO detecta adulteração/fraude
   * (confirmar que um RENAVAM/placa lido é o VERDADEIRO do veículo, não
   * só que "parece" um RENAVAM/placa, exigiria um provedor de visão
   * computacional com base de dados contratado — a Didit, usada para
   * documentos de identidade, não cobre documentos de veículo; ver
   * `DiditService`). `analiseCompleta: false` no retorno é o sinal
   * explícito disso para quem chama.
   */
  async analyzeVehicleDocument(
    dto: AnalyzeVehicleDocumentDto,
  ): Promise<VehicleDocumentAnalysisResponseDto> {
    return {
      tipo: dto.tipo,
      ...(await this.analyzeImageQuality(dto.referenciaArquivo, (texto) =>
        detectVehicleDocumentFields(texto, dto.tipo),
      )),
    };
  }

  /**
   * Qualificação do MOTORISTA que a Didit não cobre — EAR/Curso
   * especializado (Frente F, Dossiê 28 `DRV-03`/`DRV-04`). Mesma análise
   * de `analyzeVehicleDocument` (formato/resolução + OCR de
   * palavras-chave desde a Frente H — ver a ressalva completa lá),
   * reaproveitada porque o problema é idêntico: nenhum provedor cobre
   * certificado específico de trânsito brasileiro (a Didit só reconhece
   * documento de identidade mundial).
   *
   * CUIDADO ao mapear o resultado em `DriversService`: NUNCA usar
   * `qualidadeAdequada: true`/`camposEncontrados` não-vazio para marcar
   * `rottaAiStatus = APROVADO` — isso alimentaria
   * `computeSchoolTransportEligibility` com uma aprovação que não
   * verificou a AUTENTICIDADE do conteúdo (validade do registro EAR/
   * conclusão do curso), inflando indevidamente o selo "Transportador
   * Verificado" do Marketplace. `qualidadeAdequada: false` (defeito
   * real, verificado) é seguro para REPROVADO; `true` deve continuar
   * `INDISPONIVEL` — mesmo comportamento de hoje (aguardando revisão
   * humana ou um provedor real), só que agora com o defeito óbvio
   * (ilegível/formato errado/palavras-chave ausentes) efetivamente
   * barrado.
   */
  async analyzeDriverDocument(
    dto: AnalyzeDriverDocumentDto,
  ): Promise<VehicleDocumentAnalysisResponseDto> {
    return {
      tipo: dto.tipo,
      ...(await this.analyzeImageQuality(dto.referenciaArquivo, (texto) =>
        detectDriverDocumentFields(texto, dto.tipo),
      )),
    };
  }

  /**
   * Núcleo compartilhado de `analyzeVehicleDocument`/`analyzeDriverDocument`
   * (Frentes E/F/G/H) — baixa o arquivo, aplica `readImageMetadata` +
   * limiar de resolução mínima e, quando a imagem está legível, roda OCR
   * (`extractTextFromImage`) e a checagem de campos específica do tipo
   * (`detectFields`, injetado por quem chama). OCR só roda quando
   * `qualidadeAdequada` — não vale a pena tentar ler texto de uma imagem
   * já sabidamente ilegível. Autenticidade continua fora de escopo — ver
   * a ressalva completa no doc comment de `analyzeVehicleDocument`.
   */
  private async analyzeImageQuality(
    referenciaArquivo: string,
    detectFields: (texto: string) => string[],
  ): Promise<Omit<VehicleDocumentAnalysisResponseDto, "tipo">> {
    const response = await fetch(referenciaArquivo);
    if (!response.ok) {
      throw new BadGatewayException(
        `Não foi possível baixar o arquivo para análise (${referenciaArquivo}): HTTP ${response.status}.`,
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = readImageMetadata(buffer);

    const avisos: string[] = [];
    let qualidadeAdequada = false;

    if (!metadata.formato) {
      avisos.push(
        "Formato de arquivo não reconhecido como imagem (esperado JPEG ou PNG) — não é possível avaliar a qualidade.",
      );
    } else if (metadata.larguraPx === null || metadata.alturaPx === null) {
      avisos.push(
        "Não foi possível ler as dimensões da imagem — o arquivo pode estar corrompido ou incompleto.",
      );
    } else if (metadata.larguraPx < LARGURA_MINIMA_PX || metadata.alturaPx < ALTURA_MINIMA_PX) {
      avisos.push(
        `Resolução baixa (${metadata.larguraPx}x${metadata.alturaPx}px) — abaixo do mínimo recomendado (${LARGURA_MINIMA_PX}x${ALTURA_MINIMA_PX}px); o texto do documento pode ficar ilegível.`,
      );
    } else {
      qualidadeAdequada = true;
    }

    let ocrExecutado = false;
    let camposEncontrados: string[] = [];
    if (qualidadeAdequada) {
      const texto = await extractTextFromImage(buffer);
      if (texto) {
        ocrExecutado = true;
        camposEncontrados = detectFields(texto);
        if (camposEncontrados.length === 0) {
          avisos.push(
            "O OCR rodou mas não encontrou nenhum dos campos esperados pra este tipo de documento — confira se o arquivo enviado é mesmo o documento certo.",
          );
        }
      } else {
        avisos.push(
          "Não foi possível extrair texto da imagem via OCR desta vez (pode ser uma falha temporária do OCR, não necessariamente um problema com o documento) — a checagem de campos foi pulada.",
        );
      }
    }

    avisos.push(
      "Esta análise cobre formato, resolução e presença de palavras/números esperados via OCR — não confirma autenticidade nem detecta adulteração; isso continua exigindo um provedor de visão computacional contratado.",
    );

    return {
      formatoValido: metadata.formato !== null,
      formatoDetectado: metadata.formato,
      larguraPx: metadata.larguraPx,
      alturaPx: metadata.alturaPx,
      qualidadeAdequada,
      tamanhoBytes: buffer.length,
      ocrExecutado,
      camposEncontrados,
      avisos,
      analiseCompleta: false,
    };
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
   * Validação pós-assinatura do CONTRATO (briefing "Marketplace"
   * §"ROTTA AI" — "valida o contrato assinado e ativa automaticamente o
   * transporte"). Chamada por `ContractsService` de forma best-effort
   * assim que as DUAS assinaturas (Responsável + Empresa) já estão
   * presentes — mas, diferente dos demais usos da Rotta AI neste
   * módulo, a ATIVAÇÃO do contrato em si NUNCA depende do resultado
   * desta chamada: "ambas as partes assinaram" é um fato que o próprio
   * banco já garante com certeza, sem precisar de nenhum provedor
   * externo para confirmá-lo.
   *
   * Frente I: REAL desde esta entrega, mas honesta sobre seu alcance —
   * não é uma verificação certificada de assinatura eletrônica (isso
   * exigiria contratar um provedor como a Authentique, que continua
   * stub honesto em `AuthentiqueService` — nenhuma credencial
   * contratada). O que É real: uma checagem HEURÍSTICA sobre os
   * próprios metadados já coletados no momento de cada assinatura
   * (`AuditLogService`, `ip`/`userAgent`/`createdAt` de
   * `ASSINADO_RESPONSAVEL`/`ASSINADO_EMPRESA`), procurando os dois
   * sinais mais baratos de fraude/erro:
   *   1. Mesmo IP assinando dos dois lados (Responsável e Empresa) —
   *      indício de uma única pessoa clicando os dois botões.
   *   2. Assinatura ocorrendo poucos segundos após a geração do
   *      contrato (`Contract.createdAt`) — tempo insuficiente para ter
   *      lido o conteúdo.
   * Nunca inventa uma anomalia que os dados não sustentam — lista vazia
   * significa apenas "nada suspeito nos sinais disponíveis", nunca
   * "contrato garantidamente legítimo".
   */
  async validarContratoAssinado(
    dto: ValidarContratoAssinadoDto,
    actor: AuthenticatedUser,
  ): Promise<ContractSignatureValidationResponseDto> {
    const contract = await this.prisma.withTenant(
      this.prisma.contract.findFirst({ where: { id: dto.contractId } }),
    );
    if (
      !contract ||
      (actor.role !== Role.ADMIN_ROTTA &&
        contract.companyId !== actor.tenantId &&
        contract.responsavelId !== actor.sub)
    ) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    const { items: eventos } = await this.auditLogService.listByEntity(
      "Contract",
      dto.contractId,
      1,
      50,
    );
    const assinadoResponsavel = eventos.find((e) => e.acao === "ASSINADO_RESPONSAVEL");
    const assinadoEmpresa = eventos.find((e) => e.acao === "ASSINADO_EMPRESA");

    const anomaliasDetectadas: string[] = [];

    if (
      assinadoResponsavel?.ip &&
      assinadoEmpresa?.ip &&
      assinadoResponsavel.ip === assinadoEmpresa.ip
    ) {
      anomaliasDetectadas.push(
        `Mesmo IP (${assinadoResponsavel.ip}) assinou como Responsável e como Empresa — confirme que as duas partes de fato usaram conexões/dispositivos diferentes.`,
      );
    }

    for (const [rotulo, evento] of [
      ["Responsável", assinadoResponsavel],
      ["Empresa", assinadoEmpresa],
    ] as const) {
      if (!evento) continue;
      const segundosAteAssinar = (evento.createdAt.getTime() - contract.createdAt.getTime()) / 1000;
      if (segundosAteAssinar >= 0 && segundosAteAssinar < SIGNATURE_TOO_FAST_SECONDS) {
        anomaliasDetectadas.push(
          `Assinatura da ${rotulo} ocorreu ${Math.round(segundosAteAssinar)}s após a geração do contrato — tempo pouco provável para ter lido o conteúdo.`,
        );
      }
    }

    return { contractId: dto.contractId, anomaliasDetectadas, analiseCompleta: false };
  }

  /**
   * Rotta Route AI — otimização automática de sequência de paradas
   * (ROT-08, Dossiê 18). Real desde esta entrega: usa
   * `GeoEngineService.optimizeTrip` (OSRM `/trip`) para calcular a
   * sequência de menor tempo total, mantendo fixos os pontos de
   * origem/destino obrigatórios (`RouteStop` de menor e maior `ordem` —
   * "chegada final na escola no horário certo"); só os pontos
   * INTERMEDIÁRIOS são reordenados.
   *
   * NUNCA altera a rota (regra de negócio de ROT-08: "a sugestão nunca
   * altera a rota automaticamente") — só devolve a comparação lado a
   * lado (ordem atual × sugerida, com a economia de tempo estimada)
   * para o Gestor decidir. Lê `Route`/`RouteStop` direto via
   * `PrismaService.withTenant` (mesmo padrão de
   * `DashboardRepository`/`AnalyticsRepository`: leitura pontual de um
   * modelo de outro módulo sem precisar depender do módulo inteiro —
   * `RoutesModule` já importa `MarketplaceModule`/`VehiclesModule`, que
   * por sua vez importam `RottaAiModule`; um import de volta criaria um
   * ciclo). RLS via `TenantGuard`/`withTenant` já filtra a query pelo
   * tenant correto — o segundo confere `route.companyId === actor.tenantId`
   * abaixo é defesa em profundidade explícita (mesmo raciocínio do
   * comentário de `PrismaService.withTenant`), não a única barreira.
   */
  async suggestRouteOptimization(
    dto: SuggestRouteOptimizationDto,
    actor: AuthenticatedUser,
  ): Promise<RouteOptimizationResponseDto> {
    const route = await this.prisma.withTenant(
      this.prisma.route.findFirst({ where: { id: dto.routeId, deletedAt: null } }),
    );
    if (!route || (actor.role !== Role.ADMIN_ROTTA && route.companyId !== actor.tenantId)) {
      throw new NotFoundException("Rota não encontrada.");
    }

    const stops = await this.prisma.withTenant(
      this.prisma.routeStop.findMany({
        where: { routeId: dto.routeId },
        orderBy: { ordem: "asc" },
      }),
    );

    if (stops.length < 3) {
      throw new BadRequestException(
        "A otimização de rota exige pelo menos 3 paradas cadastradas — abaixo disso não há ganho relevante a calcular (Dossiê 18, ROT-08).",
      );
    }

    const pontos = stops.map((stop) => ({
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
    }));
    const origem = pontos[0]!;
    const destino = pontos[pontos.length - 1]!;
    const intermediarios = pontos.slice(1, -1);

    const [atual, sugestao] = await Promise.all([
      this.geoEngine.getRoute(origem, destino, intermediarios),
      this.geoEngine.optimizeTrip(pontos),
    ]);

    const ordemAtualIds = stops.map((stop) => stop.id);
    const ordemSugeridaIds = sugestao.ordemSugerida.map((indice) => stops[indice]!.id);
    const jaOtimizada = ordemAtualIds.every((id, indice) => id === ordemSugeridaIds[indice]);

    return {
      routeId: dto.routeId,
      ordemAtualIds,
      ordemSugeridaIds,
      duracaoAtualSegundos: atual.duracaoSegundos,
      duracaoSugeridaSegundos: sugestao.duracaoSegundos,
      economiaSegundos: Math.max(0, atual.duracaoSegundos - sugestao.duracaoSegundos),
      distanciaSugeridaMetros: sugestao.distanciaMetros,
      jaOtimizada,
    };
  }
}
