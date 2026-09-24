import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { TraccarForwardDto } from "./dto/traccar-forward.dto";
import { TrackerIngestGuard } from "./tracker-ingest.guard";
import { TrackersService } from "./trackers.service";

import { Public } from "@/common/decorators/public.decorator";

/**
 * Entrada de posições dos rastreadores físicos.
 *
 * `@Public()` remove o `JwtAuthGuard` — não existe usuário aqui, é
 * máquina falando com máquina — e o `TrackerIngestGuard` entra no lugar
 * com o segredo compartilhado. Mesmo desenho do endpoint interno de
 * fila (`QstashSignatureGuard`).
 *
 * `@ApiExcludeController` tira do Swagger público: o contrato desta
 * rota é com o Traccar, não com nenhum cliente da Rotta, e publicá-la
 * só ajudaria quem quisesse sondar o formato.
 *
 * SEMPRE 200. O Traccar reentrega o que falha, para sempre — um IMEI
 * desconhecido respondido com 4xx viraria uma fila infinita de
 * retentativas impossíveis, atrasando as posições dos ônibus corretos.
 * O motivo da recusa vai no corpo, para quem estiver depurando.
 */
@ApiExcludeController()
@Controller("trackers")
export class TrackersController {
  constructor(private readonly trackersService: TrackersService) {}

  @Public()
  @UseGuards(TrackerIngestGuard)
  @Post("posicoes")
  @HttpCode(HttpStatus.OK)
  registrarPosicao(@Body() dto: TraccarForwardDto) {
    return this.trackersService.registrarPosicao(dto);
  }
}
