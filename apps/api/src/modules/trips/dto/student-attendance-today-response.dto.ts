import { ApiProperty } from "@nestjs/swagger";

/**
 * Presença de UM aluno hoje (Frente 5 do fluxo novo de Rotas —
 * "o sistema salva se os alunos foram para a escola... menos aqueles
 * que não foram"). `ausenteHoje: true` quando existe um evento
 * `TripStudentEvent` do tipo `AUSENTE` registrado hoje pra este aluno,
 * em QUALQUER viagem/rota da mesma empresa (RLS de `withTenant` já
 * garante isso — nunca cross-tenant, ver `TripsService.
 * getStudentsAttendanceToday`). Sem nenhum evento hoje conta como
 * presente (`false`) — o padrão nunca bloqueia embarque por falta de
 * dado, só quando a ausência foi de fato registrada.
 */
export class StudentAttendanceTodayResponseDto {
  @ApiProperty() studentId!: string;
  @ApiProperty() ausenteHoje!: boolean;
}
