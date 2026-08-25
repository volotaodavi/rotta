import { ApiPropertyOptional } from "@nestjs/swagger";

import { RouteStudentResponseDto } from "./route-student-response.dto";

/**
 * `RouteStudentResponseDto` + nomes legíveis (pedido do usuário: "aparece
 * as informações — nome dos alunos, escolas, horário, bairros,
 * responsáveis" — no card antes de deslizar para iniciar a viagem).
 * Mesmo princípio já aplicado em `TransportRequest` (`studentNome`/
 * `responsavelNome`/`schoolNome`, achado real documentado ali: "sem os
 * campos... impossível de fato 'ver quem solicitou'") — todos opcionais
 * porque um join pode falhar isoladamente (aluno/escola/responsável
 * removido) sem derrubar a lista inteira.
 */
export class RouteStudentDetalhadoResponseDto extends RouteStudentResponseDto {
  @ApiPropertyOptional() studentNome?: string;
  @ApiPropertyOptional() schoolNome?: string;
  /** Bairro do embarque do aluno (`Student.embarqueBairro`) — a mesma informação de cadastro, nunca extraída do texto do endereço da parada. */
  @ApiPropertyOptional() bairro?: string;
  @ApiPropertyOptional() responsavelNome?: string;
  /** Horário previsto da parada de embarque deste aluno (`RouteStop.horarioPrevisto`). */
  @ApiPropertyOptional() horarioPrevisto?: string;
}
