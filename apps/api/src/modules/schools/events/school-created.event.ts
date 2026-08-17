/**
 * Nome do evento (`@nestjs/event-emitter`) que `SchoolsService` emite
 * sempre que uma Escola nasce SEM coordenadas já resolvidas (cadastro
 * manual pela Empresa/Gestor/Admin Rotta em `POST /schools`, ou
 * importação em massa via `POST /schools/import`) — pedido do usuário:
 * "quem deve colocar a latitude e longitude e endereço é a IA, não o
 * usuário manualmente". `SchoolsModule` nunca importa `GeoModule`
 * diretamente (seria um ciclo — `GeoModule` já importa `SchoolsModule`
 * pra ler/gravar `School.latitude`/`longitude`, ver nota em
 * `schools.module.ts`); o evento é o desacoplamento, mesmo padrão já
 * usado para `COMMUNICATION_REQUESTED_EVENT`.
 *
 * NUNCA emitido por `GeoPipelineService.quickRegisterSchool()` (o
 * autocadastro do Responsável) nem por `InepSyncService` — os dois já
 * chamam `GeoPipelineService.geocodeSchool()` diretamente, de dentro do
 * próprio `GeoModule`, sem precisar de evento nenhum.
 */
export const SCHOOL_CREATED_EVENT = "school.created";

export interface SchoolCreatedEvent {
  schoolId: string;
}
