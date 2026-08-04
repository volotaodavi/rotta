import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { COMMUNICATION_REQUESTED_EVENT } from "./communication-requested.event";

import type { CommunicationRequestedEvent } from "./communication-requested.event";

import { NotificationsService } from "@/modules/notifications/notifications.service";

/**
 * Único listener que traduz o evento genérico emitido pelos módulos de
 * domínio (Alunos, Escolas, Marketplace, Auth...) em uma chamada real a
 * `NotificationsService.notify` (briefing: "Toda comunicação da
 * plataforma deverá passar exclusivamente por esse módulo... nenhum
 * outro módulo poderá enviar notificações diretamente").
 *
 * Cobre hoje 5 dos 22 `NotificationEventType` com gatilho real já
 * existente no código (`NOVO_ALUNO`, `NOVA_ESCOLA`, `NOVO_CONTRATO`,
 * `CONTRATO_ASSINADO`, `NOVO_RESPONSAVEL`). Os demais 17 permanecem
 * intencionalmente não emitidos por nenhum módulo ainda, mesmo
 * princípio de "stub honesto" já aplicado em `RottaAiService`/
 * `AuthentiqueService` — nunca se inventa aqui uma origem de dados que
 * não existe:
 * - `VIAGEM_INICIADA`/`VIAGEM_ENCERRADA`/`ALUNO_EMBARCOU`/
 *   `ALUNO_DESEMBARCOU`/`ALUNO_AUSENTE`/`VEICULO_PROXIMO`/
 *   `ROTA_ALTERADA`/`OCORRENCIA`/`EMERGENCIA`: dependem do módulo Rotas/
 *   GPS (tasks #92-108), ainda não implementado.
 * - `MOTORISTA_ALTERADO`/`MONITOR_ALTERADO`/`VEICULO_ALTERADO`: hoje
 *   `vehicleId`/`motoristaId`/`monitorId` só são definidos uma vez, na
 *   geração do contrato (`ContractsService.gerarContrato`) — não existe
 *   endpoint de reatribuição/troca no Marketplace ainda.
 * - `CNH_VENCENDO`/`DOCUMENTO_VENCENDO`: dependem de um scheduler de
 *   verificação de vencimento ainda não implementado.
 * - `PAGAMENTO_APROVADO`/`PAGAMENTO_RECUSADO`/`PAGAMENTO_PENDENTE`:
 *   dependem de um módulo de cobrança/pagamentos ainda não implementado.
 */
@Injectable()
export class CommunicationEventsListener {
  private readonly logger = new Logger(CommunicationEventsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(COMMUNICATION_REQUESTED_EVENT)
  async handle(event: CommunicationRequestedEvent): Promise<void> {
    try {
      await this.notificationsService.notify(event);
    } catch (error) {
      this.logger.warn(
        `Falha ao processar evento de comunicação (tipo ${event.tipo}, userId ${event.userId})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
