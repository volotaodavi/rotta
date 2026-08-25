import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Uma linha do "localizador"/mapa em tempo real (GPS-01/03/06) — um
 * item por viagem `EM_ANDAMENTO` do tenant, já com os dados que o mapa
 * precisa para desenhar o marcador sem uma segunda chamada (placa,
 * nome do motorista, nome/turno da rota).
 */
export class MapVehicleResponseDto {
  @ApiProperty() tripId!: string;
  @ApiProperty() routeId!: string;
  @ApiProperty() routeNome!: string;
  @ApiProperty() turno!: string;
  @ApiProperty() veiculoId!: string;
  @ApiProperty() placa!: string;
  @ApiPropertyOptional() latitude?: number | null;
  @ApiPropertyOptional() longitude?: number | null;
  @ApiPropertyOptional() ultimaPosicaoEm?: Date | null;
  @ApiProperty() motoristaNome!: string;
  @ApiPropertyOptional() monitorNome?: string | null;
  @ApiProperty() iniciadaEm!: Date;
  /** Só populado no Mapa Nacional de Veículos (Admin Rotta sem `companyId`) — identifica de qual empresa é cada marcador. */
  @ApiPropertyOptional() companyId?: string;
  @ApiPropertyOptional() companyNome?: string;
  /** Idem — alimentam a busca por localidade/CNPJ da Central de Monitoramento do Admin. */
  @ApiPropertyOptional() companyCidade?: string;
  @ApiPropertyOptional() companyBairro?: string;
  @ApiPropertyOptional() companyCpfCnpj?: string;
}
