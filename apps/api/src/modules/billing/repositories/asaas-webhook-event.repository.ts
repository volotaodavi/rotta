export interface RegistrarEventoAsaasData {
  id: string;
  evento: string;
  recursoId?: string | null;
}

/**
 * O registro de entrega dos webhooks do Asaas.
 *
 * Nenhum método cruza tenant porque não há tenant nenhum: a tabela não
 * tem RLS e não guarda dado de transportadora. Ver o model
 * `AsaasWebhookEvent` em `schema.prisma`.
 */
export interface AsaasWebhookEventRepository {
  /**
   * `true` quando este evento já foi recebido antes.
   *
   * Entrega é at least once, então isto é a diferença entre processar um
   * pagamento uma vez e processá-lo quantas vezes o provedor reentregar.
   */
  jaRecebido(id: string): Promise<boolean>;

  /** Guarda o evento. Reentrega do mesmo `id` não é erro: não faz nada. */
  registrar(data: RegistrarEventoAsaasData): Promise<void>;

  /** Marca o fim do processamento, para separar "já tratado" de "falhou no meio". */
  marcarProcessado(id: string): Promise<void>;
}

export const ASAAS_WEBHOOK_EVENT_REPOSITORY = Symbol("ASAAS_WEBHOOK_EVENT_REPOSITORY");
