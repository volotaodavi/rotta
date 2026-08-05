import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@upstash/qstash";

import type { AppConfig } from "@/config/app.config";
import type { QstashConfig } from "@/config/qstash.config";
import type { FlowControl, PublishToApiResponse } from "@upstash/qstash";

export interface PublishOptions {
  /** Quantas vezes o QStash tenta reentregar antes de chamar `failureCallbackRoute` (padrão: 3, mesma contagem que o BullMQ usava). */
  retries?: number;
  /**
   * Isola o throughput deste tipo de job dos demais (equivalente ao
   * `concurrency`/`limiter` de cada fila BullMQ separada — aqui todas
   * batem no mesmo endpoint HTTP, então o isolamento vem da chave de
   * Flow Control do QStash, não de filas físicas distintas).
   */
  flowControlKey?: string;
  /** Máximo de entregas concorrentes com a mesma `flowControlKey` (padrão do QStash: sem limite). */
  flowControlParallelism?: number;
  /** Máximo de entregas por `flowControlPeriod` com a mesma `flowControlKey` (rate limit — ex.: geocodificação respeitando o Nominatim público). */
  flowControlRate?: number;
  /** Janela de tempo do rate limit acima (ex.: "1s", "2s"). Padrão do QStash: "1s". */
  flowControlPeriod?: string;
  /** Rota (relativa a `/internal/queue/`) chamada pelo QStash quando TODAS as tentativas se esgotam sem uma resposta 2xx — substitui o `OnWorkerEvent('failed')` do BullMQ após esgotar `attempts`. */
  failureCallbackRoute?: string;
  /** Atraso antes da primeira tentativa de entrega, em segundos. */
  delaySeconds?: number;
}

export interface BatchPublishItem<TBody> {
  route: string;
  body: TBody;
  options?: PublishOptions;
}

/** Monta o `FlowControl` do QStash a partir de `PublishOptions` — a união discriminada do SDK exige `parallelism` OU `rate`/`ratePerSecond`, então a validação de qual combinação faz sentido é responsabilidade de quem chama `publishJSON`/`publishBatchJSON` (nunca lançamos aqui por um valor ausente). */
function buildFlowControl(options: PublishOptions): FlowControl | undefined {
  if (!options.flowControlKey) return undefined;
  return {
    key: options.flowControlKey,
    parallelism: options.flowControlParallelism,
    rate: options.flowControlRate,
    period: options.flowControlPeriod,
  } as FlowControl;
}

/**
 * Publicador de jobs via QStash (Upstash) — substitui `Queue.add`/
 * `Queue.addBulk` do BullMQ (Dossie 14) na implantação 100% Vercel: como
 * não existe processo Node permanente para um `Worker` ficar escutando o
 * Redis, o "worker" vira um endpoint HTTP público desta própria API
 * (`/internal/queue/<route>`) que o QStash invoca via HTTP POST,
 * aplicando retry/backoff/isolamento por conta própria (ver `PublishOptions`).
 *
 * Cada módulo injeta este serviço em vez de `@InjectQueue` (BullMQ) —
 * mesma disciplina de repositório único por dependência externa já
 * usada em `GeoEngineService`/`RedisService`.
 */
@Injectable()
export class QstashPublisherService {
  private readonly logger = new Logger(QstashPublisherService.name);
  private readonly client: Client;
  private readonly qstashConfig: QstashConfig;
  private readonly appConfig: AppConfig;

  constructor(configService: ConfigService) {
    this.qstashConfig = configService.get<QstashConfig>("qstash")!;
    this.appConfig = configService.get<AppConfig>("app")!;
    this.client = new Client({ token: this.qstashConfig.token });
  }

  /** `true` quando `QSTASH_TOKEN`/`API_PUBLIC_URL` estão configurados — sem eles, publicar é um no-op documentado (mesmo padrão de "stub honesto" dos canais de Communication sem credencial). */
  get isConfigured(): boolean {
    return Boolean(this.qstashConfig.token && this.qstashConfig.apiPublicUrl);
  }

  private destinationUrl(route: string): string {
    return `${this.qstashConfig.apiPublicUrl}/${this.appConfig.apiPrefix}/internal/queue/${route}`;
  }

  /**
   * Publica um job e devolve o `messageId` do QStash (`undefined` sem
   * QStash configurado — apenas loga e não lança, mesma disciplina de
   * "recusa o envio com um erro claro" seria pior aqui: derrubaria a
   * requisição de negócio inteira por causa de uma notificação/job
   * assíncrono).
   */
  async publishJSON<TBody>(
    route: string,
    body: TBody,
    options: PublishOptions = {},
  ): Promise<string | undefined> {
    if (!this.isConfigured) {
      this.logger.warn(
        `QSTASH_TOKEN/API_PUBLIC_URL não configurados — job "${route}" não foi publicado.`,
      );
      return undefined;
    }

    const response = (await this.client.publishJSON({
      url: this.destinationUrl(route),
      body,
      retries: options.retries ?? 3,
      delay: options.delaySeconds,
      failureCallback: options.failureCallbackRoute
        ? this.destinationUrl(options.failureCallbackRoute)
        : undefined,
      flowControl: buildFlowControl(options),
    })) as PublishToApiResponse;
    return response.messageId;
  }

  /** Publica vários jobs numa única chamada em lote — substitui `Queue.addBulk` (ex.: um job de geocodificação por escola nova/alterada, potencialmente milhares na mesma sincronização INEP). */
  async publishBatchJSON<TBody>(items: BatchPublishItem<TBody>[]): Promise<void> {
    if (items.length === 0) return;
    if (!this.isConfigured) {
      this.logger.warn(
        `QSTASH_TOKEN/API_PUBLIC_URL não configurados — lote de ${items.length} job(s) "${items[0]!.route}" não foi publicado.`,
      );
      return;
    }

    await this.client.batchJSON(
      items.map((item) => ({
        url: this.destinationUrl(item.route),
        body: item.body,
        retries: item.options?.retries ?? 3,
        delay: item.options?.delaySeconds,
        failureCallback: item.options?.failureCallbackRoute
          ? this.destinationUrl(item.options.failureCallbackRoute)
          : undefined,
        flowControl: buildFlowControl(item.options ?? {}),
      })),
    );
  }
}
