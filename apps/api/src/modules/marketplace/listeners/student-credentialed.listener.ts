import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";


import { TRANSPORT_REQUEST_REPOSITORY } from "../marketplace.constants";

import type { TransportRequestRepository } from "../repositories/transport-request.repository";
import type { StudentCredentialedEvent } from "@/modules/students/events/student-credentialed.event";

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
  ) {}

  @OnEvent(STUDENT_CREDENTIALED_EVENT)
  async handle(event: StudentCredentialedEvent): Promise<void> {
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

      await this.transportRequestRepository.updateStatus(created.id, {
        status: "APROVADA",
        motivoRecusa: null,
      });
    } catch (error) {
      this.logger.warn(
        `Não foi possível credenciar automaticamente o aluno ${event.studentId} com a empresa ${event.companyId}.`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
