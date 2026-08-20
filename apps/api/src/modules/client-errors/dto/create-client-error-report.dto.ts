import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClientApp } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Reporte de um erro real capturado no navegador do usuário (`error.tsx`
 * do App Router de `apps/web`/`apps/admin`). Achado real desta sessão:
 * em produção (Vercel), o Next.js REDIGE a mensagem original de todo
 * erro de "Server Components render" antes de mandar pro navegador —
 * só um `digest` opaco chega até aqui, e a mensagem completa só existe
 * no painel da Vercel (Deployments → Logs), inacessível pra quem não é
 * dono do projeto. `POST /client-errors` é `@Public()` de propósito: um
 * erro pode acontecer ANTES do login terminar (ex. na própria tela de
 * "Entrar"), e não faz sentido um erro-de-relatar-erro bloquear o
 * relatório em si.
 */
export class CreateClientErrorReportDto {
  @ApiProperty({ enum: ClientApp })
  @IsEnum(ClientApp)
  app!: ClientApp;

  @ApiProperty({ example: "An error occurred in the Server Components render..." })
  @IsString()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ description: "error.digest — Next.js redige a mensagem real em produção" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  digest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  stack?: string;

  @ApiProperty({ example: "/rotas/3c5f883f-83e0-45fa-8bef-2cc5217c1b85" })
  @IsString()
  @MaxLength(500)
  path!: string;

  /**
   * `companyId` do usuário logado no momento do erro, quando o front
   * consegue resolvê-lo (ex. `user.companyId` do `AuthProvider`) — só
   * um sinal a mais pra filtrar/correlacionar no admin, nunca confiado
   * como identidade: `userId` real vem do token (quando presente), não
   * daqui.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
