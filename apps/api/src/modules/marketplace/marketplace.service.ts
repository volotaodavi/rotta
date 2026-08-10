import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import {
  toTransporterCardResponseDto,
  toTransporterDetailResponseDto,
} from "./mappers/transporter.mapper";
import { TRANSPORTER_REPOSITORY } from "./marketplace.constants";

import type { SearchTransportersQueryDto } from "./dto/search-transporters-query.dto";
import type {
  ListTransportersResponseDto,
  TransporterCardResponseDto,
  TransporterDetailResponseDto,
} from "./dto/transporter-response.dto";
import type {
  TransporterCandidate,
  TransporterRepository,
} from "./repositories/transporter.repository";

import { haversineDistanceKm } from "@/shared/utils/geo.util";

const RECENT_RATINGS_LIMIT = 10;
/** Cap razoável para o bloco "Escolas atendidas" do perfil público — evita uma lista infinita para redes grandes. */
const SCHOOLS_LIMIT = 30;

function distanceToCandidate(
  candidate: TransporterCandidate,
  latitude: number,
  longitude: number,
): number {
  const { company } = candidate;
  // Já filtrado por `latitude`/`longitude` `not: null` na query — os
  // `!` abaixo refletem essa garantia, nunca um valor arbitrário.
  return haversineDistanceKm(
    latitude,
    longitude,
    Number(company.latitude),
    Number(company.longitude),
  );
}

/**
 * Núcleo de negócio da busca de transportadores (briefing "Marketplace"
 * §"BUSCA"/"FILTROS"/"TRANSPORTADORES"). Filtros que a query SQL já
 * resolve (`escolaId`/`tipoVeiculo`/`tipoEmpresa`) vão para
 * `TransporterRepository.searchCandidates`; os que dependem de valores
 * só calculáveis depois de carregar o candidato (`raioKm` — distância
 * Haversine; `avaliacaoMin` — média das `Rating`s; `apenasVerificados` —
 * `computeVerified`) são aplicados aqui, na camada de aplicação.
 */
@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(TRANSPORTER_REPOSITORY) private readonly transporterRepository: TransporterRepository,
  ) {}

  async search(query: SearchTransportersQueryDto): Promise<ListTransportersResponseDto> {
    const candidates = await this.transporterRepository.searchCandidates({
      escolaId: query.escolaId,
      tipoVeiculo: query.tipoVeiculo,
      tipoEmpresa: query.tipoEmpresa,
    });

    let cards: TransporterCardResponseDto[] = candidates.map((candidate) =>
      toTransporterCardResponseDto(
        candidate,
        distanceToCandidate(candidate, query.latitude, query.longitude),
      ),
    );

    if (query.raioKm !== undefined) {
      cards = cards.filter((card) => card.distanciaKm <= query.raioKm!);
    }
    if (query.avaliacaoMin !== undefined) {
      cards = cards.filter(
        (card) => card.avaliacaoMedia !== null && card.avaliacaoMedia >= query.avaliacaoMin!,
      );
    }
    if (query.mensalidadeMaxCentavos !== undefined) {
      // Empresas sem contrato ativo ainda não têm um "preço-base"
      // conhecido (mensalidade só existe por `Contract` — não há campo
      // de preço no cadastro da Empresa); em vez de excluí-las
      // injustamente de um filtro de preço máximo, mantemos apenas as
      // que TÊM um valor conhecido E o excedem fora da lista.
      cards = cards.filter(
        (card) =>
          card.mensalidadeAPartirDeCentavos === null ||
          card.mensalidadeAPartirDeCentavos <= query.mensalidadeMaxCentavos!,
      );
    }
    if (query.apenasVerificados) {
      cards = cards.filter((card) => card.verificado);
    }

    cards = sortCards(cards, query.sortBy);

    const total = cards.length;
    const start = (query.page - 1) * query.pageSize;
    const items = cards.slice(start, start + query.pageSize);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findByIdOrThrow(
    companyId: string,
    latitude?: number,
    longitude?: number,
  ): Promise<TransporterDetailResponseDto> {
    const candidate = await this.transporterRepository.findCandidateById(companyId);
    if (!candidate) {
      throw new NotFoundException("Transportador não encontrado.");
    }

    // Sem coordenadas do Responsável (ex. acesso direto à página de
    // detalhes, já vindo do cartão que exibiu a distância), `0` é o
    // valor de convenção — a distância não é o foco desta tela.
    const distanciaKm =
      latitude !== undefined && longitude !== undefined
        ? distanceToCandidate(candidate, latitude, longitude)
        : 0;

    const [recentRatings, escolasAtendidas, equipe, tempoMedioRespostaHoras] = await Promise.all([
      this.transporterRepository.listRecentRatingsForCompany(companyId, RECENT_RATINGS_LIMIT),
      this.transporterRepository.listActiveSchoolsForCompany(companyId, SCHOOLS_LIMIT),
      this.transporterRepository.listPublicTeamForCompany(companyId),
      this.transporterRepository.computeAverageResponseHours(companyId),
    ]);

    return toTransporterDetailResponseDto(
      candidate,
      distanciaKm,
      recentRatings,
      escolasAtendidas,
      equipe,
      tempoMedioRespostaHoras,
    );
  }
}

function sortCards(
  cards: TransporterCardResponseDto[],
  sortBy: SearchTransportersQueryDto["sortBy"],
): TransporterCardResponseDto[] {
  const sorted = [...cards];
  if (sortBy === "avaliacao") {
    sorted.sort((a, b) => (b.avaliacaoMedia ?? -1) - (a.avaliacaoMedia ?? -1));
  } else if (sortBy === "mensalidade") {
    sorted.sort(
      (a, b) =>
        (a.mensalidadeAPartirDeCentavos ?? Number.MAX_SAFE_INTEGER) -
        (b.mensalidadeAPartirDeCentavos ?? Number.MAX_SAFE_INTEGER),
    );
  } else {
    sorted.sort((a, b) => a.distanciaKm - b.distanciaKm);
  }
  return sorted;
}
