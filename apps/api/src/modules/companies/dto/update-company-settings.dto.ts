import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsObject, IsOptional } from "class-validator";

const NOTIFICATION_CHANNELS = ["push", "whatsapp", "sms", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * Configurações operacionais da Empresa (Dossiê 16 — "Configurações":
 * Tema, Notificações, Integrações; Nome/Logo/Idioma/Horário já são
 * colunas de `Company`, editadas via `PATCH /companies/:id`). Persistido
 * como `CompanySetting` chave/valor (Dossiê 8, Seção 3.2) — este DTO é a
 * fachada tipada sobre esse armazenamento genérico.
 */
export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ enum: ["dark", "light"] })
  @IsOptional()
  @IsIn(["dark", "light"])
  tema?: "dark" | "light";

  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(NOTIFICATION_CHANNELS, { each: true })
  canaisNotificacao?: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Mapa de integrações habilitadas/desabilitadas (ex. { "google-maps": true })',
    type: "object",
    additionalProperties: { type: "boolean" },
  })
  @IsOptional()
  @IsObject()
  integracoes?: Record<string, boolean>;
}

export function assertBooleanMap(value: Record<string, unknown>): value is Record<string, boolean> {
  return Object.values(value).every((v) => typeof v === "boolean");
}
