import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "@/infra/cache/redis.service";

/**
 * Nível de saúde real de uma integração externa — nunca "está
 * configurada" (isso é `not_configured`/`unknown`, não saúde), sempre
 * derivado de chamadas reais que de fato aconteceram.
 *
 * - `healthy`: última chamada teve sucesso, sem falhas consecutivas.
 * - `degraded`: pelo menos 1 falha consecutiva recente, mas ainda não
 *   atingiu o limiar de `down` — sinal de alerta, não de indisponibilidade.
 * - `down`: 3+ falhas consecutivas — a integração está efetivamente fora.
 * - `not_configured`: credenciais ausentes (nem tentou chamar) — estado
 *   diferente de `down`, porque não é uma falha, é uma configuração
 *   pendente (mesma distinção de `RottaPayProviderService`/
 *   `AbacatePayClientService`: "sem credenciais" nunca deve aparecer
 *   como "fora do ar").
 * - `unknown`: nenhuma chamada registrada ainda desde o último boot/
 *   `flushall` do Redis — não confundir com `healthy`.
 */
export type IntegrationStatusLevel = "healthy" | "degraded" | "down" | "not_configured" | "unknown";

export interface IntegrationHealthSnapshot {
  integration: string;
  status: IntegrationStatusLevel;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
}

interface StoredIntegrationHealth {
  status: IntegrationStatusLevel;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
}

const DEGRADED_AFTER_CONSECUTIVE_FAILURES = 1;
const DOWN_AFTER_CONSECUTIVE_FAILURES = 3;

const KEY_PREFIX = "integration_health";

/**
 * Rastreador de saúde REAL de integrações externas (PROMPT — ROTTA
 * INTEGRATION & INTELLIGENCE AUDIT ENGINE, Seção 34 — "Health &
 * Business Monitoring"). Nasce da mesma disciplina de
 * `ErrorTrackingService` (Dossiê 33): observabilidade de verdade, não
 * decorativa.
 *
 * DIFERENÇA DELIBERADA em relação a `HealthController.readiness()`
 * (Dossiê 12 §10.1): aquele endpoint testa se Postgres/Redis estão
 * alcançáveis AGORA (um `SELECT 1`/`SET` síncrono, disparado na hora da
 * chamada). Este serviço não dispara chamada nenhuma — ele só REGISTRA
 * o resultado (sucesso/falha/latência) de chamadas que os próprios
 * módulos de negócio já fazem no curso normal de operação
 * (`AbacatePayClientService.request`, `GeoEngineService.geocode`, etc.),
 * e deriva um status a partir do HISTÓRICO recente. Isso responde a uma
 * pergunta diferente e mais útil: "essa integração está falhando *na
 * prática*, com tráfego real?" — em vez de "ela respondeu a um ping
 * artificial agora mesmo?".
 *
 * Sem TTL nas chaves — o snapshot persiste até o Redis reiniciar
 * (limitação aceita e documentada: um `unknown` após restart do Redis
 * não é um bug, é o estado inicial honesto até a próxima chamada real
 * acontecer).
 */
@Injectable()
export class IntegrationHealthService {
  private readonly logger = new Logger(IntegrationHealthService.name);

  constructor(private readonly redis: RedisService) {}

  private key(integration: string): string {
    return `${KEY_PREFIX}:${integration}`;
  }

  private static readonly UNKNOWN_SNAPSHOT: StoredIntegrationHealth = {
    status: "unknown",
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
    lastLatencyMs: null,
    consecutiveFailures: 0,
  };

  /**
   * `read`/`write` nunca lançam (achado real da auditoria de CI de
   * 04/09/2026, ao rodar os testes E2E pela primeira vez): este
   * serviço é chamado sempre via `void this.integrationHealth.recordX(...)`
   * (fire-and-forget, de propósito — registrar saúde nunca deve
   * bloquear a chamada real que está sendo medida). Sem o
   * try/catch aqui, uma falha real do próprio Redis (conexão caindo,
   * reinício, etc.) virava uma promise rejeitada sem `.catch()` em
   * cada um dos 6 call sites — rejeição não tratada que, num teste
   * Jest, aparecia atribuída a QUALQUER teste rodando no momento (não
   * necessariamente o que causou a falha), e em produção poderia
   * derrubar o processo. Mesma disciplina de "nunca lança" já usada em
   * `WebPushService`/`AdminInboxEmailService`: rastrear a saúde de uma
   * integração não pode, ela mesma, criar um novo modo de falha.
   */
  private async read(integration: string): Promise<StoredIntegrationHealth> {
    try {
      const stored = await this.redis.get<StoredIntegrationHealth>(this.key(integration));
      return stored ?? IntegrationHealthService.UNKNOWN_SNAPSHOT;
    } catch (error) {
      this.logger.warn(
        `Falha ao ler o histórico de saúde de "${integration}" no Redis — assumindo estado desconhecido. Erro: ${error instanceof Error ? error.message : String(error)}`,
      );
      return IntegrationHealthService.UNKNOWN_SNAPSHOT;
    }
  }

  private async write(integration: string, value: StoredIntegrationHealth): Promise<void> {
    try {
      await this.redis.set(this.key(integration), value);
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar o histórico de saúde de "${integration}" no Redis — descartado (best-effort). Erro: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Chamada real teve sucesso — zera falhas consecutivas, status volta a `healthy`. */
  async recordSuccess(integration: string, latencyMs: number): Promise<void> {
    await this.write(integration, {
      status: "healthy",
      lastSuccessAt: new Date().toISOString(),
      lastFailureAt: (await this.read(integration)).lastFailureAt,
      lastError: null,
      lastLatencyMs: latencyMs,
      consecutiveFailures: 0,
    });
  }

  /** Chamada real falhou — acumula falhas consecutivas e deriva `degraded`/`down`. */
  async recordFailure(integration: string, errorMessage: string): Promise<void> {
    const current = await this.read(integration);
    const consecutiveFailures = current.consecutiveFailures + 1;
    const status: IntegrationStatusLevel =
      consecutiveFailures >= DOWN_AFTER_CONSECUTIVE_FAILURES
        ? "down"
        : consecutiveFailures >= DEGRADED_AFTER_CONSECUTIVE_FAILURES
          ? "degraded"
          : "healthy";

    if (status === "down" && current.status !== "down") {
      this.logger.error(
        `Integração "${integration}" está DOWN (${consecutiveFailures} falhas consecutivas). Último erro: ${errorMessage}`,
      );
    }

    await this.write(integration, {
      status,
      lastSuccessAt: current.lastSuccessAt,
      lastFailureAt: new Date().toISOString(),
      lastError: errorMessage,
      lastLatencyMs: current.lastLatencyMs,
      consecutiveFailures,
    });
  }

  /**
   * Credenciais ausentes — nenhuma chamada real foi tentada. Não altera
   * `lastSuccessAt`/`lastFailureAt`/`consecutiveFailures` (não é um
   * evento de sucesso nem de falha, é um estado de configuração).
   */
  async recordNotConfigured(integration: string, reason: string): Promise<void> {
    const current = await this.read(integration);
    await this.write(integration, {
      ...current,
      status: "not_configured",
      lastError: reason,
    });
  }

  async getSnapshot(integration: string): Promise<IntegrationHealthSnapshot> {
    const stored = await this.read(integration);
    return { integration, ...stored };
  }

  async getAllSnapshots(integrations: string[]): Promise<IntegrationHealthSnapshot[]> {
    return Promise.all(integrations.map((integration) => this.getSnapshot(integration)));
  }
}
