import { ApiProperty } from "@nestjs/swagger";
import { CommunicationChannel, NotificationEventType, NotificationPriority } from "@prisma/client";

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: NotificationEventType }) tipo!: NotificationEventType;
  @ApiProperty({ enum: NotificationPriority }) prioridade!: NotificationPriority;
  @ApiProperty() titulo!: string;
  @ApiProperty() corpo!: string;
  @ApiProperty({ type: Object, nullable: true }) dadosContexto!: Record<string, unknown> | null;
  @ApiProperty({ enum: CommunicationChannel, isArray: true })
  canaisEscolhidos!: CommunicationChannel[];
  @ApiProperty() lida!: boolean;
  @ApiProperty({ nullable: true }) lidaEm!: Date | null;
  @ApiProperty() favoritada!: boolean;
  @ApiProperty() arquivada!: boolean;
  @ApiProperty() createdAt!: Date;
}

export class ListNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] }) items!: NotificationResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
