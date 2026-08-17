import type { SchoolShift } from "@prisma/client";

/**
 * Nome do evento (`@nestjs/event-emitter`) que `StudentsService.create()`
 * emite quando um Student nasce a partir de um pré-cadastro reivindicado
 * (`preRegistrationId` — fluxo "código do transporte + celular", Frente
 * X-Z) — pedido do usuário: "o responsável ao integrar a sua rota com o
 * transportador, inserindo o código, deverá... de fato credenciar aquele
 * motorista". Achado desta auditoria: esse fluxo criava o `Student` e
 * PARAVA aí — nunca gerava a `TransportRequest`/`Contract` que o resto
 * da plataforma (Rotas, Trips, GPS ao vivo) depende pra existir, porque
 * `RouteStudent.contractId` só aceita um Contrato de verdade. Sem
 * Contrato, o aluno nunca podia ser posto numa Rota, nenhum motorista
 * nunca aparecia "se credenciando", e não havia como a rota aparecer em
 * tempo real pra ninguém.
 *
 * `StudentsModule` nunca importa `MarketplaceModule` diretamente (seria
 * um ciclo — `MarketplaceModule` já importa `StudentsModule`, ver nota
 * em `students.module.ts`); o evento é o desacoplamento, mesmo padrão já
 * usado em `SCHOOL_CREATED_EVENT`.
 */
export const STUDENT_CREDENTIALED_EVENT = "student.credentialed";

export interface StudentCredentialedEvent {
  studentId: string;
  responsavelId: string;
  companyId: string;
  schoolId: string;
  turno: SchoolShift;
}
