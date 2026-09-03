import { ApiProperty } from "@nestjs/swagger";
import { AdminRottaPapel, UserStatus } from "@prisma/client";

export class AdminAccountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() email!: string;
  @ApiProperty() telefone!: string;
  @ApiProperty({ enum: AdminRottaPapel }) papel!: AdminRottaPapel;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty() createdAt!: Date;
}
