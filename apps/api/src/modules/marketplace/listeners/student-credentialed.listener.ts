import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "@prisma/client";

import { CONTRACT_REPOSITORY, TRANSPORT_REQUEST_REPOSITORY } from "../marketplace.constants";

import type { ContractRepository } from "../repositories/contract.repository";
import type { TransportRequestRepository } from "../repositories/transport-request.repository";
import type { StudentCredentialedEvent } from "@/modules/students/events/student-credentialed.event";

import { CompaniesService } from "@/modules/companies/companies.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { STUDENT_CREDENTIALED_EVENT } from "@/modules/students/events/student-credentialed.event";

/**
 * "O responsável ao integrar a sua rota com o transportador, inserindo
 * o código, deverá... de fato credenciar aquele motorista" (pedido do
 * usuário) — o fluxo "código do transporte + celular" (Frente X-Z)
 * criava o `Student` e parava aí, sem nenhuma `TransportRequest`/
 * `Contract`, então o aluno nunca podia entrar numa `Route` de verdade.
 *
 * Este listener fecha esse elo: reage ao `STUDENT_CREDENTIALED_EVENT`
 * criando a `TransportRequest` já `APROVADA` — a transportadora que
 * originou o pré-cadastro é, por definição, quem já concordou em
 * atender esta família (o "código" É o convite dela), então não faz
 * sentido reabrir uma fila de aprovação que ela mesma já decidiu. A
 * Empresa/Gestor segue exatamente o mesmo caminho de sempre a partir
 * daqui (`/marketplace/solicitacoes` → gerar contrato, escolhendo
 * mensalidade/motorista/veículo de verdade — nenhum valor é inventado
 * aqui, só a solicitação em si).
 *
 * Também gera o "termo de ciência" automático (pedido do usuário —
 * "nesse primeiro momento... um termo de ciência... para gerar a rota"):
 * um `Contract` placeholder já `ATIVO`, `origem: TERMO_CIENCIA_AUTOMATICO`
 * (ver nota do model Prisma). Sem isso a `TransportRequest` sozinha não
 * bastava — `RouteStudent.contractId` exige um Contract de verdade, e a
 * Empresa só teria como testar Rotas depois de negociar um contrato
 * comercial completo. Best-effort: se falhar, a `TransportRequest`
 * continua criada normalmente (a Empresa ainda pode gerar o contrato
 * negociado manual de sempre).
 *
 * `MarketplaceModule` já importa `StudentsModule` (não o contrário, ver
 * nota em `students.module.ts`) — o evento é o que permite reagir a uma
 * ação de `StudentsService` sem criar esse ciclo.
 */
@Injectable()
export class StudentCredentialedListener {
  private readonly logger = new Logger(StudentCredentialedListener.name);

  constructor(
    @Inject(TRANSPORT_REQUEST_REPOSITORY)
    private readonly transportRequestRepository: TransportRequestRepository,
    @Inject(CONTRACT_REPOSITORY)
    private readonly contractRepository: ContractRepository,
    private readonly companiesService: CompaniesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
  ) {}

  @OnEvent(STUDENT_CREDENTIALED_EVENT)
  async handle(event: StudentCredentialedEvent): Promise<void> {
    let transportRequestId: string;
    try {
      const existing = await this.transportRequestRepository.findOpenByStudentAndCompany(
        event.studentId,
        event.companyId,
      );
      if (existing) return;

      const created = await this.transportRequestRepository.create({
        studentId: event.studentId,
        responsavelId: event.responsavelId,
        companyId: event.companyId,
        schoolId: event.schoolId,
        turno: event.turno,
      });
      transportRequestId = created.id;

      await this.transportRequestRepository.updateStatus(created.id, {
        status: "APROVADA",
        motivoRecusa: null,
      });
    } catch (error) {
      this.logger.warn(
        `Não foi possível credenciar automaticamente o aluno ${event.studentId} com a empresa ${event.companyId}.`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
      return;
    }

    // Termo de ciência: falha aqui não desfaz a TransportRequest acima —
    // a Empresa ainda pode gerar o contrato negociado manualmente pelo
    // caminho de sempre (`/marketplace/solicitacoes`).
    try {
      const contract = await this.contractRepository.createTermoCienciaAutomatico({
        transportRequestId,
        studentId: event.studentId,
        responsavelId: event.responsavelId,
        companyId: event.companyId,
        schoolId: event.schoolId,
      });

      const nomeEmpresa =
        (await this.companiesService.getNomeFantasia(event.companyId)) ?? "a transportadora";
      const { titulo, corpo } = this.messagePersonalizationService.termoCienciaGerado(nomeEmpresa);
      this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
        userId: contract.responsavelId,
        companyId: contract.companyId,
        tipo: NotificationEventType.NOVO_CONTRATO,
        titulo,
        corpo,
        dadosContexto: { contractId: contract.id },
      });
    } catch (error) {
      this.logger.warn(
        `Não foi possível gerar o termo de ciência automático para o aluno ${event.studentId} (TransportRequest ${transportRequestId}).`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
