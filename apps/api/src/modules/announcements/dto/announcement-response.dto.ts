import { ApiProperty } from "@nestjs/swagger";
import { AnnouncementAudience } from "@prisma/client";

export class AnnouncementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty() corpo!: string;
  @ApiProperty({ enum: AnnouncementAudience }) publico!: AnnouncementAudience;
  @ApiProperty() criadoPorUserId!: string;
  @ApiProperty() criadoPorNome!: string;
  @ApiProperty() destinatariosCount!: number;
  @ApiProperty() createdAt!: Date;
}

export class ListAnnouncementsResponseDto {
  @ApiProperty({ type: [AnnouncementResponseDto] }) items!: AnnouncementResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
