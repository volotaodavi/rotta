import type { Rating, RatingTargetType } from "@prisma/client";

export interface CreateRatingData {
  contractId: string;
  responsavelId: string;
  companyId: string;
  alvoTipo: RatingTargetType;
  alvoId: string;
  nota: number;
  comentario?: string;
}

/** Ver nota de escopo em `TransportRequestAccessScope` (mesma convenção). */
export interface RatingAccessScope {
  responsavelId?: string;
  companyId?: string;
}

/**
 * `ratings` TEM RLS por `companyId` (mesmo mecanismo de `Contract`).
 * `create` é sempre chamado pelo Responsável (sem `companyId` próprio no
 * contexto ambiente) — usa `withBypass`, mesmo motivo já documentado em
 * `TransportRequestRepository.create`. `listByContract` alterna entre
 * `withTenant` (Empresa/Gestor, contexto ambiente já certo) e
 * `withBypass` (Responsável).
 */
export interface RatingRepository {
  create(data: CreateRatingData): Promise<Rating>;
  findByContractResponsavelAlvo(
    contractId: string,
    responsavelId: string,
    alvoTipo: RatingTargetType,
  ): Promise<Rating | null>;
  listByContract(contractId: string, scope: RatingAccessScope): Promise<Rating[]>;
}
