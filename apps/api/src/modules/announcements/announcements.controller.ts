import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AnnouncementsService } from "./announcements.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { ListAnnouncementsQueryDto } from "./dto/list-announcements-query.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST do módulo Avisos/Comunicados — exclusivo de Admin Rotta,
 * mesmo padrão de RBAC de `SupportController` (`ADM-04`).
 */
@ApiTags("announcements")
@ApiBearerAuth()
@Controller("announcements")
@Roles(Role.ADMIN_ROTTA)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.announcementsService.create(dto, actor);
  }

  @Get()
  list(@Query() query: ListAnnouncementsQueryDto) {
    return this.announcementsService.list(query);
  }
}
