import { ApiProperty } from "@nestjs/swagger";
import { DeviceTokenPlatform } from "@prisma/client";
import { IsEnum, IsString, MinLength } from "class-validator";

/** Registro/renovação de Token FCM (briefing "PUSH NOTIFICATION") — chamado pelo app a cada abertura, mesmo token ou um novo após renovação automática do FCM. */
export class RegisterDeviceTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  token!: string;

  @ApiProperty({ enum: DeviceTokenPlatform })
  @IsEnum(DeviceTokenPlatform)
  plataforma!: DeviceTokenPlatform;
}
