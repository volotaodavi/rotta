import { ApiPropertyOptional } from "@nestjs/swagger";
import { AdminRottaPapel, UserStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

/** Muda o papel e/ou o status (ativa/desativa) de uma conta Admin já existente — nunca o próprio ator (ver `AdminAccountsService.assertNotSelf`). */
export class UpdateAdminAccountDto {
  @ApiPropertyOptional({ enum: AdminRottaPapel })
  @IsOptional()
  @IsEnum(AdminRottaPapel)
  papel?: AdminRottaPapel;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
