import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DriverDocumentType, NotificationEventType, VehicleDocumentType } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Marcos de antecedência (dias corridos) — mesmo raciocínio "===` exato" de `TrialNotificationsService`: cada documento é avisado no máximo 2 vezes (30 e 7 dias antes), sem precisar de campo de dedup no schema. */
const MARCOS_DIAS = [30, 7] as const;

const VEHICLE_DOCUMENT_TYPE_LABEL: Record<VehicleDocumentType, string> = {
  CRLV: "CRLV",
  LICENCIAMENTO: "Licenciamento",
  SEGURO: "Seguro",
  LAUDO: "Laudo",
  VISTORIA: "Vistoria",
  FOTO: "Foto",
  OUTRO: "Documento",
};

const DRIVER_DOCUMENT_TYPE_LABEL: Record<Exclude<DriverDocumentType, "CNH">, string> = {
  EAR: "EAR (Exercício de Atividade Remunerada)",
  CURSO_TRANSPORTE_ESCOLAR: "Curso de Transporte Escolar",
  ANTECEDENTES_CRIMINAIS: "Atestado de Antecedentes Criminais",
  OUTRO: "Documento",
};

/** Dias corridos INTEIROS até `vencimentoEm` (mesma função de calendário de `diasAteTrialExpirar`, duplicada de propósito — módulos independentes, sem acoplamento cruzado só por uma conta de datas). */
function diasAteVencer(vencimentoEm: Date, referencia: Date): number {
  const data = (d: Date): number => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((data(vencimentoEm) - data(referencia)) / MS_PER_DAY);
}

/**
 * Lembretes de vencimento de documento (pedido do usuário 01/09/2026:
 * "CNH/documento vencendo") — `CNH_VENCENDO`/`DOCUMENTO_VENCENDO` já
 * existiam configurados no `NotificationChannelSelectorService`, mas
 * nenhum código disparava: gap real corrigido aqui, cobrindo os dois
 * lugares onde `vencimentoEm` já existe no schema —
 * `DriverDocument` (CNH/EAR/Curso/Antecedentes do motorista) e
 * `VehicleDocument` (CRLV/Licenciamento/Seguro/Laudo/Vistoria do
 * veículo).
 *
 * Disparado por `DocumentExpirySchedulerService` (QStash, cron diário)
 * — nunca por ação de usuário. Dois marcos de antecedência (30 e 7
 * dias), cada um só uma vez por documento (comparação `===` exata
 * sobre dias de calendário — mesmo trade-off documentado de
 * `TrialNotificationsService`: se o job cair exatamente naquele dia, o
 * aviso daquele marco específico é perdido).
 *
 * `DriverDocument` notifica DOIS destinatários (o próprio motorista —
 * é o documento dele — e Empresa/Gestor, que responde legalmente pela
 * frota); `VehicleDocument` só Empresa/Gestor (não há um "dono"
 * individual do veículo).
 */
@Injectable()
export class DocumentExpiryService {
  private readonly logger = new Logger(DocumentExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async avaliarTodosOsDocumentos(referencia: Date = new Date()): Promise<{ notificados: number }> {
    const [driverDocs, vehicleDocs] = await this.prisma.runWithTenantContext(
      { tenantId: null, bypass: true },
      () =>
        Promise.all([
          this.prisma.driverDocument.findMany({
            where: { deletedAt: null, vencimentoEm: { not: null } },
            include: { user: { select: { nome: true } } },
          }),
          this.prisma.vehicleDocument.findMany({
            where: { deletedAt: null, vencimentoEm: { not: null } },
          }),
        ]),
    );

    let notificados = 0;

    for (const doc of driverDocs) {
      if (!doc.vencimentoEm) continue;
      const diasRestantes = diasAteVencer(doc.vencimentoEm, referencia);
      if (!MARCOS_DIAS.includes(diasRestantes as (typeof MARCOS_DIAS)[number])) continue;

      await this.notificarDriverDocumentBestEffort(doc, diasRestantes);
      notificados += 1;
    }

    for (const doc of vehicleDocs) {
      if (!doc.vencimentoEm) continue;
      const diasRestantes = diasAteVencer(doc.vencimentoEm, referencia);
      if (!MARCOS_DIAS.includes(diasRestantes as (typeof MARCOS_DIAS)[number])) continue;

      await this.notificarVehicleDocumentBestEffort(doc, diasRestantes);
      notificados += 1;
    }

    this.logger.log(
      `Avaliação diária de vencimento de documentos: ${driverDocs.length} de motorista, ${vehicleDocs.length} de veículo em aberto — ${notificados} notificado(s) hoje.`,
    );
    return { notificados };
  }

  private async notificarDriverDocumentBestEffort(
    doc: {
      id: string;
      userId: string;
      companyId: string;
      tipo: DriverDocumentType;
      user: { nome: string };
    },
    diasRestantes: number,
  ): Promise<void> {
    try {
      const isCnh = doc.tipo === DriverDocumentType.CNH;
      const tipoEvento = isCnh
        ? NotificationEventType.CNH_VENCENDO
        : NotificationEventType.DOCUMENTO_VENCENDO;
      const mensagem = isCnh
        ? this.messagePersonalizationService.cnhVencendo(doc.user.nome, diasRestantes)
        : this.messagePersonalizationService.documentoVencendo(
            DRIVER_DOCUMENT_TYPE_LABEL[doc.tipo as Exclude<DriverDocumentType, "CNH">],
            diasRestantes,
          );

      // O próprio motorista — é o documento dele.
      this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
        userId: doc.userId,
        companyId: doc.companyId,
        tipo: tipoEvento,
        titulo: mensagem.titulo,
        corpo: mensagem.corpo,
      });

      // Empresa/Gestor — responde legalmente pela frota.
      const memberships = await this.usersService.listMembershipsByCompany(doc.companyId);
      for (const membership of memberships) {
        if ((membership.role as Role) !== Role.EMPRESA && (membership.role as Role) !== Role.GESTOR)
          continue;
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: membership.userId,
          companyId: doc.companyId,
          tipo: tipoEvento,
          titulo: mensagem.titulo,
          corpo: mensagem.corpo,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar vencimento do documento de motorista ${doc.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async notificarVehicleDocumentBestEffort(
    doc: { id: string; companyId: string; tipo: VehicleDocumentType },
    diasRestantes: number,
  ): Promise<void> {
    try {
      const mensagem = this.messagePersonalizationService.documentoVencendo(
        VEHICLE_DOCUMENT_TYPE_LABEL[doc.tipo],
        diasRestantes,
      );

      const memberships = await this.usersService.listMembershipsByCompany(doc.companyId);
      for (const membership of memberships) {
        if ((membership.role as Role) !== Role.EMPRESA && (membership.role as Role) !== Role.GESTOR)
          continue;
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: membership.userId,
          companyId: doc.companyId,
          tipo: NotificationEventType.DOCUMENTO_VENCENDO,
          titulo: mensagem.titulo,
          corpo: mensagem.corpo,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar vencimento do documento de veículo ${doc.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
