import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NominatimRateLimitedException } from "../geo-engine.service";
import { GeoPipelineService } from "../geo-pipeline.service";

import type { SchoolCreatedEvent } from "@/modules/schools/events/school-created.event";

import { SCHOOL_CREATED_EVENT } from "@/modules/schools/events/school-created.event";

/** Backoff entre novas tentativas quando o Nominatim está sob rate limit (429) — nunca imediato, dá tempo real pro limite liberar. */
const RETRY_BACKOFF_MS = [5_000, 20_000, 60_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * "Quem deve colocar a latitude e longitude e endereço é a IA, não o
 * usuário manualmente" (pedido do usuário) — toda escola criada pelo
 * cadastro manual (Empresa/Gestor/Admin Rotta, `POST /schools`) ou por
 * importação em massa (`POST /schools/import`) chega aqui SEM
 * coordenadas; este listener chama a mesma Geocoding/Validation AI
 * Agent (`GeoPipelineService.geocodeSchool`, Nominatim/OSM via
 * `GeoEngineService`) que já resolve isso pro autocadastro do
 * Responsável e pro Education Sync Agent — nunca inventa uma
 * coordenada, nunca bloqueia o cadastro em si (endereço sem
 * correspondência no Nominatim cai na Fila de Revisão Manual, a escola
 * continua existindo e utilizável, só sem pino no mapa até alguém
 * revisar).
 *
 * Achado real testando ponta a ponta em produção (Frente AE): uma
 * escola cadastrada enquanto a importação nacional do INEP está
 * saturando o rate limit do Nominatim recebia 429, `geocodeSchool`
 * propaga (`NominatimRateLimitedException` nunca cai em Revisão
 * Manual — throttling é temporário, não "sem endereço"), e este
 * listener só logava um aviso e desistia pra sempre: a escola ficava
 * sem coordenada e SEM nenhuma tentativa futura, silenciosamente.
 * Corrigido com até 3 novas tentativas com backoff crescente — ainda
 * finito (nunca reprocessa pra sempre), mas cobre o caso real de
 * throttling concorrente em vez de desistir na primeira.
 */
@Injectable()
export class SchoolCreatedListener {
  private readonly logger = new Logger(SchoolCreatedListener.name);

  constructor(private readonly geoPipelineService: GeoPipelineService) {}

  @OnEvent(SCHOOL_CREATED_EVENT)
  async handle(event: SchoolCreatedEvent): Promise<void> {
    for (let tentativa = 0; tentativa <= RETRY_BACKOFF_MS.length; tentativa += 1) {
      try {
        await this.geoPipelineService.geocodeSchool(event.schoolId);
        return;
      } catch (error) {
        const rateLimited = error instanceof NominatimRateLimitedException;
        const restam = tentativa < RETRY_BACKOFF_MS.length;
        if (rateLimited && restam) {
          const espera = RETRY_BACKOFF_MS[tentativa]!;
          this.logger.warn(
            `Nominatim sob rate limit geocodificando a escola ${event.schoolId} — nova tentativa em ${espera}ms.`,
          );
          await sleep(espera);
          continue;
        }
        this.logger.warn(
          `Não foi possível geocodificar automaticamente a escola ${event.schoolId}.`,
        );
        this.logger.warn(error instanceof Error ? error.message : String(error));
        return;
      }
    }
  }
}
