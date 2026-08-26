import { ApiProperty } from "@nestjs/swagger";

/**
 * Item 3 do pedido do usuário ("Pode fazer os pendentes"): "reconhecer
 * o endereço alternativo do responsável dentro do raio de embarque/
 * desembarque" — hoje o botão de embarque/desembarque na tela do
 * motorista/monitor checava proximidade sempre contra a coordenada
 * FIXA da `RouteStop` física, nunca contra o desvio de endereço do dia
 * (`StudentAddressOverride`), mesmo esse desvio já valendo pra ETA/
 * linha azul/notificação (`TripsService.listPendenciasPorAluno`).
 *
 * Este DTO expõe, por aluno, a MESMA coordenada efetiva que o resto do
 * pipeline já usa — para o frontend gatear o raio de 1km contra o
 * lugar certo (a casa alternativa hoje, não a parada de sempre).
 */
export class StudentPendingLocationResponseDto {
  @ApiProperty() studentId!: string;
  @ApiProperty({ enum: ["EMBARQUE", "DESEMBARQUE"] }) tipo!: "EMBARQUE" | "DESEMBARQUE";
  /** FK real da parada (`RouteStop.id`) — nunca o id sintético do desvio. */
  @ApiProperty() routeStopId!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty() endereco!: string;
}
