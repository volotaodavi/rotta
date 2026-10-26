import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * O que o marcador do mapa diz sobre o carro.
 *
 * `SEM_RASTREADOR` é um estado de primeira classe, e não a ausência
 * dos outros três, porque a pergunta que ele responde é diferente:
 * "não sei onde está" e "este carro não tem como me dizer" levam a
 * ações opostas. O primeiro vira ligação para o motorista, o segundo
 * vira ordem de compra.
 */
export type SituacaoDoVeiculo = "EM_MOVIMENTO" | "PARADO" | "SEM_SINAL" | "SEM_RASTREADOR";

/**
 * Onde a rota está no dia.
 *
 * `NAO_INICIADA` e `CONCLUIDA` são separadas de propósito: as duas são
 * "não há viagem rodando agora", e tratá-las como a mesma coisa faria
 * o painel às 15h parecer idêntico ao painel às 5h, que é o oposto do
 * que o despachante precisa ver.
 */
export type SituacaoDaRota =
  "NAO_INICIADA" | "EM_ANDAMENTO" | "PAUSADA" | "ATRASADA" | "CONCLUIDA" | "CANCELADA";

/** Quanto o alerta grita. Nunca só cor: a tela escreve o nível por extenso. */
export type NivelDoAlerta = "CRITICO" | "ATENCAO" | "INFORMACAO";

/**
 * Um contador do topo do painel.
 *
 * `total` é anulável porque nem todo indicador tem denominador
 * honesto. "18 de 22 veículos" faz sentido; "2 ocorrências de 2" não
 * quer dizer nada, e um denominador inventado só para a tela ficar
 * simétrica é informação falsa.
 */
export class IndicadorDto {
  @ApiProperty() atual!: number;
  @ApiPropertyOptional() total!: number | null;
}

/** Os cinco contadores do topo. */
export class IndicadoresDoPainelDto {
  @ApiProperty() veiculosEmOperacao!: IndicadorDto;
  @ApiProperty() rotasEmAndamento!: IndicadorDto;
  @ApiProperty() motoristasEmAtividade!: IndicadorDto;
  @ApiProperty() monitoresEmAtividade!: IndicadorDto;
  @ApiProperty() ocorrenciasHoje!: IndicadorDto;
  /** Quantos carros da frota ainda não têm rastreador. Zero some da tela. */
  @ApiProperty() veiculosSemRastreador!: number;
}

/** Um carro no mapa, com a honestidade do sinal embutida. */
export class VeiculoNoMapaDto {
  @ApiProperty() tripId!: string;
  @ApiProperty() veiculoId!: string;
  @ApiProperty() rotaId!: string;
  @ApiProperty() rotaNome!: string;
  @ApiProperty() turno!: string;
  /** Como o despachante chama este carro: o número da frota, ou a placa quando não há número. */
  @ApiProperty() identificacao!: string;
  @ApiProperty() placa!: string;
  @ApiProperty() motoristaNome!: string;
  @ApiPropertyOptional() monitorNome!: string | null;
  @ApiProperty() situacao!: SituacaoDoVeiculo;
  @ApiPropertyOptional() latitude!: number | null;
  @ApiPropertyOptional() longitude!: number | null;
  @ApiPropertyOptional() velocidadeKmh!: number | null;
  /** Quando o APARELHO capturou esta posição. `null` = nunca houve posição nesta viagem. */
  @ApiPropertyOptional() posicaoCapturadaEm!: Date | null;
  /** Minutos entre a captura e agora. É isto que a tela escreve ao lado do marcador antigo. */
  @ApiPropertyOptional() minutosDesdeAPosicao!: number | null;
}

/** Uma rota do dia na lista do meio. */
export class RotaDoDiaDto {
  @ApiProperty() rotaId!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() turno!: string;
  @ApiProperty() situacao!: SituacaoDaRota;
  /** `null` nas rotas sem parada fixa, que é o normal no transporte público escolar. */
  @ApiPropertyOptional() horarioPrevistoInicio!: string | null;
  @ApiPropertyOptional() horarioPrevistoFim!: string | null;
  @ApiProperty() alunos!: number;
  @ApiPropertyOptional() tripId!: string | null;
  /** O carro que está nela HOJE (da viagem, ou da escala, ou o padrão), já identificado. */
  @ApiPropertyOptional() veiculoIdentificacao!: string | null;
  @ApiPropertyOptional() motoristaNome!: string | null;
  @ApiPropertyOptional() monitorNome!: string | null;
  /** Minutos de atraso sobre o horário previsto, quando há horário e há atraso. */
  @ApiPropertyOptional() minutosDeAtraso!: number | null;
}

/** Um alerta da faixa da direita. */
export class AlertaDoPainelDto {
  @ApiProperty() id!: string;
  @ApiProperty() nivel!: NivelDoAlerta;
  @ApiProperty() titulo!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty() em!: Date;
  @ApiPropertyOptional() rotaNome!: string | null;
  @ApiPropertyOptional() rotaId!: string | null;
}

/** Uma linha de "Eventos recentes". */
export class EventoRecenteDto {
  @ApiProperty() id!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty() detalhe!: string;
  @ApiProperty() em!: Date;
}

/** Uma linha da escala do dia. */
export class LinhaDaEscalaDoDiaDto {
  @ApiProperty() rotaId!: string;
  @ApiProperty() rotaNome!: string;
  @ApiProperty() turno!: string;
  @ApiProperty() veiculoIdentificacao!: string;
  @ApiProperty() motoristaNome!: string;
  @ApiPropertyOptional() monitorNome!: string | null;
  @ApiProperty() situacao!: SituacaoDaRota;
  @ApiPropertyOptional() observacao!: string | null;
}

/**
 * O painel inteiro do despachante, numa resposta só.
 *
 * Uma resposta e não seis por um motivo de operação: o painel é lido
 * de relance e recarregado a cada poucos segundos, e seis chamadas
 * paralelas a cada ciclo multiplicariam por seis o trabalho do
 * servidor para entregar a mesma tela. As consultas por dentro
 * continuam separadas e paralelas.
 *
 * `atualizadoEm` é o carimbo do SERVIDOR no momento da resposta, e a
 * tela o exibe. Não é enfeite: um painel que não diz quando foi
 * atualizado é um painel que parece ao vivo mesmo depois que a aba
 * perdeu a conexão.
 */
export class PainelDoDespachanteResponseDto {
  @ApiProperty() atualizadoEm!: Date;
  @ApiProperty() indicadores!: IndicadoresDoPainelDto;
  @ApiProperty({ type: [VeiculoNoMapaDto] }) veiculos!: VeiculoNoMapaDto[];
  @ApiProperty({ type: [RotaDoDiaDto] }) rotasDoDia!: RotaDoDiaDto[];
  @ApiProperty({ type: [AlertaDoPainelDto] }) alertas!: AlertaDoPainelDto[];
  @ApiProperty({ type: [EventoRecenteDto] }) eventosRecentes!: EventoRecenteDto[];
  @ApiProperty({ type: [LinhaDaEscalaDoDiaDto] }) escalaDoDia!: LinhaDaEscalaDoDiaDto[];
}
