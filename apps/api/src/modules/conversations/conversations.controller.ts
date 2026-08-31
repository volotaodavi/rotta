import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ConversationsService, type RequestMeta } from "./conversations.service";
import { CreateConversationMessageDto } from "./dto/create-conversation-message.dto";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";



/** RBAC de rota é só "autenticado com um destes papéis" — a checagem FINA (é participante DESTE contrato) é sempre feita dentro do `ConversationsService`, nunca aqui. */
const PARTICIPANT_ROLES = [Role.RESPONSAVEL, Role.MOTORISTA, Role.MONITOR] as const;
const READ_ROLES = [...PARTICIPANT_ROLES, Role.ADMIN_ROTTA] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * Frente 10(d) — chat direto Responsável ↔ Motorista/Monitor, escopado
 * por `Contract` (`/contracts/:contractId/conversation`, não uma
 * entidade de topo própria — a conversa não existe sem um contrato).
 * Só backend nesta entrega, como pedido explicitamente.
 */
@ApiTags("conversations")
@ApiBearerAuth()
@Controller("contracts/:contractId/conversation")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @Roles(...READ_ROLES)
  get(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.conversationsService.getConversation(contractId, actor);
  }

  @Get("messages")
  @Roles(...READ_ROLES)
  listMessages(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.conversationsService.listMessages(
      contractId,
      actor,
      Number(page),
      Number(pageSize),
    );
  }

  @Post("messages")
  @Roles(...PARTICIPANT_ROLES)
  sendMessage(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() dto: CreateConversationMessageDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.conversationsService.sendMessage(contractId, dto, actor, requestMeta(req));
  }

  @Post("read")
  @Roles(...PARTICIPANT_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.conversationsService.markAsRead(contractId, actor);
  }
}
