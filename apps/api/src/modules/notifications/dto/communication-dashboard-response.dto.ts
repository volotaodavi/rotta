import { ApiProperty } from "@nestjs/swagger";

import type { CommunicationChannel } from "@prisma/client";

/**
 * Estatística de entrega de UM canal (briefing "AGENTE 03 — Delivery
 * AI": "monitorar status de entrega"). `total` conta toda tentativa
 * (`NotificationDeliveryAttempt`, inclusive retries), nunca notificações
 * únicas — um retry após falha soma outra tentativa no mesmo canal.
 */
export class ChannelDeliveryStatsDto {
  @ApiProperty() canal!: CommunicationChannel;
  @ApiProperty() total!: number;
  @ApiProperty() entregues!: number;
  @ApiProperty() falharam!: number;
  @ApiProperty({ description: "0 a 1 — entregues/total (0 quando total é 0, nunca NaN)" })
  taxaSucesso!: number;
  @ApiProperty({
    nullable: true,
    description: "Média de `tempoRespostaMs` das tentativas ENTREGUE/LIDA",
  })
  tempoRespostaMedioMs!: number | null;
}

/**
 * Dashboard de comunicação da empresa (briefing "MÓDULO — ROTTA
 * COMMUNICATION ENGINE" — métricas agregadas de envio/entrega). Nunca
 * inclui dado de UMA notificação/usuário específico — é sempre uma
 * agregação por `companyId`, RBAC idêntico ao dashboard de
 * `CompaniesService.getDashboard` (Admin Rotta qualquer empresa,
 * Empresa/Gestor só a própria).
 */
export class CommunicationDashboardResponseDto {
  @ApiProperty() totalEnviadas!: number;
  @ApiProperty() lidas!: number;
  @ApiProperty() favoritadas!: number;
  @ApiProperty() arquivadas!: number;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "number" },
    description: 'Contagem por NotificationPriority (briefing "AGENTE 02")',
  })
  porPrioridade!: Record<string, number>;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "number" },
    description: "Contagem por NotificationEventType",
  })
  porTipo!: Record<string, number>;

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "number" },
    description:
      'Contagem por canal ESCOLHIDO na criação (briefing "AGENTE 01"), não por tentativa de entrega',
  })
  porCanalEscolhido!: Record<string, number>;

  @ApiProperty({ type: [ChannelDeliveryStatsDto] })
  entregasPorCanal!: ChannelDeliveryStatsDto[];

  @ApiProperty({ required: false, description: "Eco do filtro `desde` aplicado, se houver" })
  desde?: string;
}
