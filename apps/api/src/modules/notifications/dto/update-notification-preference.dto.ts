import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, Matches } from "class-validator";

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Preferências de canal + Quiet Hours (briefing "CONFIGURAÇÕES"/"QUIET HOURS") — atualização parcial, campos omitidos mantêm o valor atual. */
export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receberPush?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receberWhatsapp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receberSms?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receberEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  silenciarFinsDeSemana?: boolean;

  @ApiPropertyOptional({
    description: 'Formato "HH:mm" (ex. "22:00"). Envie `null` para desativar o Quiet Hours.',
  })
  @IsOptional()
  @Matches(HORA_REGEX)
  quietHoursInicio?: string | null;

  @ApiPropertyOptional({
    description: 'Formato "HH:mm" (ex. "06:00"). Envie `null` para desativar o Quiet Hours.',
  })
  @IsOptional()
  @Matches(HORA_REGEX)
  quietHoursFim?: string | null;
}
