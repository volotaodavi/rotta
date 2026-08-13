import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DiditService } from "./didit.service";

import type { AppConfig } from "@/config/app.config";
import type { DiditConfig } from "@/config/didit.config";

import { RedisService } from "@/infra/cache/redis.service";

/**
 * Chave Redis onde o `secret_shared_key` auto-descoberto fica — sem TTL
 * (só sai daqui se alguém apagar manualmente, ex. depois de recriar o
 * destino na Didit). Exportada porque `DiditWebhookGuard` também lê
 * este valor (fallback quando `DIDIT_WEBHOOK_SECRET` não está setado
 * via env var) — nunca duplicada como string solta em mais de um lugar.
 */
export const WEBHOOK_SECRET_KEY = "didit:webhook_secret";
const WEBHOOK_LABEL = "Rotta (auto-registrado)";
/**
 * Único nome de evento que temos 100% confirmado (já documentado em
 * `didit-webhook.controller.ts` desde a ativação manual do webhook) —
 * o catálogo completo de `subscribed_events` não pôde ser conferido na
 * documentação no momento em que este auto-registro foi escrito.
 */
const SUBSCRIBED_EVENTS = ["status.updated"];

/**
 * Auto-registro do destino de webhook da Didit — a Didit também expõe
 * uma API de gerenciamento (`POST /v3/webhook/destinations/`) para o
 * mesmo cadastro que hoje é feito manualmente em Business Console →
 * API & Webhooks → Add destination. Esta rotina faz esse cadastro
 * sozinha, uma vez, na subida do processo — depois dela, a verificação
 * de identidade fica automática de ponta a ponta sem qualquer clique
 * no painel da Didit (nem para o primeiro ambiente, nem para um novo
 * ambiente/deploy futuro).
 *
 * Passo a passo (`ensureWebhookRegistered`):
 * 1. Sem `DIDIT_API_KEY` ou `API_PUBLIC_URL`: não faz nada — falta
 *    informação para montar/autenticar a chamada (ambiente sem Didit
 *    habilitada, ex. dev local, é o caso normal aqui).
 * 2. `DIDIT_WEBHOOK_SECRET` já setado via env var: respeita a
 *    configuração explícita, nunca sobrescreve por cima.
 * 3. Segredo já salvo no Redis (de um boot anterior desta própria
 *    rotina): nada a fazer.
 * 4. Lista os destinos já cadastrados na Didit — se um já aponta para
 *    a nossa URL (`${API_PUBLIC_URL}/${API_PREFIX}/webhooks/didit`),
 *    NÃO cria outro (evitar duplicata), mas também não há como
 *    recuperar o segredo dele (a Didit só mostra uma vez, na criação)
 *    — loga um aviso pedindo `DIDIT_WEBHOOK_SECRET` manual ou recriar
 *    o destino pelo Business Console.
 * 5. Nenhum destino para a nossa URL: cria um novo e persiste o
 *    `secret_shared_key` retornado no Redis — dali em diante
 *    `DiditWebhookGuard` lê esse valor (env var continua tendo
 *    prioridade se alguém setar depois).
 *
 * Qualquer falha (rede, formato de resposta inesperado da Didit — a
 * documentação de `/v3/webhook/destinations/` não pôde ser conferida
 * por completo) só loga um aviso: nunca derruba a subida da aplicação
 * nem impede o resto da integração Didit (verificação standalone/
 * sessão) de funcionar. Quem quiser confirmar se o auto-registro
 * funcionou consulta os logs de boot ou o Business Console da Didit.
 */
@Injectable()
export class DiditWebhookProvisioningService implements OnModuleInit {
  private readonly logger = new Logger(DiditWebhookProvisioningService.name);
  private readonly diditConfig: DiditConfig;
  private readonly appConfig: AppConfig;

  constructor(
    configService: ConfigService,
    private readonly didit: DiditService,
    private readonly redis: RedisService,
  ) {
    this.diditConfig = configService.get<DiditConfig>("didit")!;
    this.appConfig = configService.get<AppConfig>("app")!;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureWebhookRegistered();
    } catch (error) {
      this.logger.warn(
        `Auto-registro do webhook Didit falhou — a verificação de identidade continua funcionando se o destino já estiver configurado manualmente (Business Console → API & Webhooks). Erro: ${(error as Error).message}`,
      );
    }
  }

  private async ensureWebhookRegistered(): Promise<void> {
    if (!this.diditConfig.apiKey || !this.diditConfig.apiPublicUrl) {
      return;
    }
    if (this.diditConfig.webhookSecret) {
      this.logger.log(
        "DIDIT_WEBHOOK_SECRET já configurado manualmente — auto-registro do webhook não é necessário.",
      );
      return;
    }
    if (await this.redis.get<string>(WEBHOOK_SECRET_KEY)) {
      return;
    }

    const webhookUrl = `${this.diditConfig.apiPublicUrl}/${this.appConfig.apiPrefix}/webhooks/didit`;

    const destinations = await this.didit.listWebhookDestinations();
    const existing = destinations.find((destination) => destination.url === webhookUrl);
    if (existing) {
      this.logger.warn(
        `Já existe um destino de webhook Didit para ${webhookUrl} (id=${existing.id}), mas o segredo dele não pode ser recuperado agora — a Didit só mostra o secret_shared_key uma vez, na criação. Configure DIDIT_WEBHOOK_SECRET manualmente com o segredo já emitido, ou apague esse destino no Business Console para que o próximo boot registre um novo automaticamente.`,
      );
      return;
    }

    const created = await this.didit.createWebhookDestination(
      webhookUrl,
      SUBSCRIBED_EVENTS,
      WEBHOOK_LABEL,
    );
    await this.redis.set(WEBHOOK_SECRET_KEY, created.secret);
    this.logger.log(
      `Destino de webhook Didit registrado automaticamente (id=${created.id}, url=${webhookUrl}) — verificação de identidade agora é automática de ponta a ponta.`,
    );
  }
}
