import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { GeocodingAiAgentService } from "./agents/geocoding-ai-agent.service";
import { ValidationAiAgentService } from "./agents/validation-ai-agent.service";
import { SCHOOL_COORDINATE_REPOSITORY } from "./geo.constants";

import type { QuickRegisterSchoolDto } from "./dto/quick-register-school.dto";
import type { SchoolCoordinateRepository } from "./repositories/school-coordinate.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { SchoolResponseDto } from "@/modules/schools/dto/school-response.dto";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { RequestMeta } from "@/modules/schools/schools.service";
import type { SchoolCoordinate } from "@prisma/client";

import { SCHOOL_REPOSITORY } from "@/modules/schools/schools.constants";
import { SchoolsService } from "@/modules/schools/schools.service";

const MAX_TENTATIVAS = 3;

/**
 * Orquestra o fluxo completo da Rotta Geo Platform para UMA escola já
 * cadastrada (briefing §"FLUXO COMPLETO": Geocoding AI Agent → Mapbox →
 * Validation AI Agent → aprovado/reprocessar). Disparado tanto por uma
 * ação manual (`GeoController`, Empresa/Gestor/Admin Rotta pedindo para
 * geocodificar/regeocodificar uma escola) quanto automaticamente pelo
 * Education Sync Agent (`InepSyncService`) para toda escola nova ou com
 * endereço alterado detectada na sincronização com o Censo Escolar.
 *
 * O laço de `REPROCESSANDO` é limitado pelo próprio `ValidationAiAgentService`
 * (nunca reprocessa além de `MAX_TENTATIVAS`) — o `for` aqui é só uma
 * segunda trava defensiva, nunca a única, para garantir que este método
 * NUNCA entra em loop infinito mesmo que a regra de corte mude.
 */
@Injectable()
export class GeoPipelineService {
  private readonly logger = new Logger(GeoPipelineService.name);

  constructor(
    private readonly geocodingAgent: GeocodingAiAgentService,
    private readonly validationAgent: ValidationAiAgentService,
    @Inject(SCHOOL_REPOSITORY)
    private readonly schoolRepository: SchoolRepository,
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
    private readonly schoolsService: SchoolsService,
  ) {}

  async geocodeSchool(schoolId: string): Promise<SchoolCoordinate> {
    const school = await this.schoolRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException("Escola não encontrada.");
    }

    const endereco = `${school.logradouro}, ${school.numero}, ${school.bairro}, ${school.cidade} - ${school.estado}, ${school.cep}`;

    let coordinate = await this.geocodingAgent.geocodeSchool(school.id, endereco, 1);

    for (let iteracao = 0; iteracao < MAX_TENTATIVAS; iteracao += 1) {
      const outcome = await this.validationAgent.validate(coordinate, school);
      if (outcome.status !== "REPROCESSANDO") {
        return outcome.coordinate;
      }
      coordinate = outcome.proxima;
    }

    return coordinate;
  }

  /**
   * Correção manual de uma coordenada na Fila de Revisão Manual
   * (briefing "IMPORTANTE" — 3 tentativas automáticas esgotadas, um
   * humano decide). Nunca sobrescreve a linha `REVISAO_MANUAL`: grava
   * uma NOVA tentativa (`fonte: MANUAL`, já `VALIDADO`, sem passar pelo
   * Validation AI Agent — a fonte é a decisão humana, não o Nominatim) e
   * atualiza `School.latitude`/`longitude`, mesmo efeito final de uma
   * aprovação automática.
   */
  async resolveManualReview(coordinateId: string, input: { latitude: number; longitude: number }) {
    const anterior = await this.coordinateRepository.findById(coordinateId);
    if (!anterior || anterior.status !== "REVISAO_MANUAL") {
      throw new NotFoundException("Coordenada não encontrada na fila de revisão manual.");
    }

    const school = await this.schoolRepository.findById(anterior.schoolId);
    if (!school) {
      throw new NotFoundException("Escola não encontrada.");
    }

    const revisada = await this.coordinateRepository.create({
      schoolId: anterior.schoolId,
      latitude: input.latitude,
      longitude: input.longitude,
      precisao: "1.00",
      fonte: "MANUAL",
      tentativa: anterior.tentativa + 1,
    });
    const validada = await this.coordinateRepository.updateStatus(revisada.id, "VALIDADO", {
      validadoPorIa: false,
    });
    await this.schoolRepository.update(school.id, {
      latitude: input.latitude,
      longitude: input.longitude,
    });

    return validada;
  }

  /**
   * Autocadastro rápido de escola pelo Responsável (`POST /geo/schools/
   * quick-register`) — pedido do usuário: "não aparece escolas para
   * clicar, nem busca rápida para ver se a escola existe. Se existe
   * agentes de IA, pq eles não estão trabalhando?". A base compartilhada
   * de Escolas só se popula hoje pela sincronização nacional com o
   * Censo Escolar (Education Sync Agent, `POST /geo/inep-sync`) — uma
   * operação de ~200 mil linhas que só Admin Rotta dispara, sob demanda
   * (nunca roda sozinha sem `INEP_SYNC_CRON`/QStash configurados no
   * ambiente de produção, fora do alcance de uma alteração de código).
   * Enquanto isso, o Responsável cadastrando o filho AGORA não pode
   * ficar esperando: esta rota deixa a própria Geocoding AI Agent
   * cadastrar a escola no catálogo compartilhado na hora, com endereço
   * geocodificado de verdade (não uma linha vazia esperando revisão
   * futura) — a escola nasce `EM_ANALISE` (mesma cautela de qualquer
   * escola nova vinda do Censo) e já aparece pra ESTE Responsável
   * selecionar imediatamente (`SchoolsController.list` não filtra por
   * status), enquanto uma Empresa/Gestor completa o cadastro depois.
   */
  async quickRegisterSchool(
    dto: QuickRegisterSchoolDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SchoolResponseDto> {
    const created = await this.schoolsService.create(
      {
        ...dto,
        // Nenhum Responsável sabe de cabeça a classificação completa da
        // escola (mesma decisão honesta de `InepSyncService` pra escola
        // nova vinda do Censo) — Empresa/Gestor completa depois.
        tipos: ["OUTRO"],
        turnosAtendidos: ["PERSONALIZADO"],
      },
      actor,
      meta,
      { status: "EM_ANALISE", origemCadastro: "AUTOCADASTRO_RESPONSAVEL" },
    );

    try {
      await this.geocodeSchool(created.id);
    } catch (error) {
      // Endereço digitado sem correspondência no Nominatim, por exemplo
      // — a escola continua criada e selecionável (só sem pino no mapa
      // ainda); nunca falha o cadastro do aluno por causa disso.
      this.logger.warn(
        `Autocadastro rápido: não foi possível geocodificar a escola ${created.id} agora.`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }

    return this.schoolsService.findByIdOrThrow(created.id, actor);
  }
}
