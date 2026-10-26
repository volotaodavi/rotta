export interface RegistrarEventoLytexData {
  id: string;
  evento: string;
  recursoId?: string | null;
}

/**
 * O registro de entrega dos webhooks da Lytex.
 *
 * Nenhum método cruza tenant porque não há tenant nenhum: a tabela não
 * tem RLS e não guarda dado de transportadora. Ver o model
 * `LytexWebhookEvent` em `schema.prisma`.
 */
export interface LytexWebhookEventRepository {
  /** `true` quando este evento já foi recebido antes. */
  jaRecebido(id: string): Promise<boolean>;

  /** Guarda o evento. Reentrega do mesmo `id` não é erro: não faz nada. */
  registrar(data: RegistrarEventoLytexData): Promise<void>;

  /** Marca o fim do processamento, para separar "já tratado" de "falhou no meio". */
  marcarProcessado(id: string): Promise<void>;
}

export const LYTEX_WEBHOOK_EVENT_REPOSITORY = Symbol("LYTEX_WEBHOOK_EVENT_REPOSITORY");
