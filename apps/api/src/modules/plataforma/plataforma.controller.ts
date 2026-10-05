import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeController } from "@nestjs/swagger";

import { PulsoService, type PulsoDaPlataforma } from "./pulso.service";

import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { DiretoriaReadGuard } from "@/modules/client-errors/diretoria-read.guard";
import { Role } from "@/shared/enums";

/**
 * O pulso da plataforma, em duas portas.
 *
 * Duas porque são dois leitores com credenciais diferentes e nenhum dos
 * dois pode usar a do outro:
 *
 * - `/plataforma/pulso` é lido pelo navegador do Admin Geral, que já
 *   tem sessão. É ele que alimenta o escritório 3D, e por isso não
 *   pode exigir o segredo da diretoria: esse segredo não vive no
 *   navegador e não deveria.
 * - `/plataforma/pulso/diretoria` é lido por um turno agendado, que não
 *   tem sessão nenhuma e autentica pelo cabeçalho.
 *
 * Mesmo dado, mesma ausência de identificador. Juntar as duas numa rota
 * só obrigaria a enfraquecer uma das duas autenticações.
 */
@ApiExcludeController()
@Controller("plataforma")
export class PlataformaController {
  constructor(private readonly pulso: PulsoService) {}

  @ApiBearerAuth()
  @Roles(Role.ADMIN_ROTTA)
  @Get("pulso")
  medir(): Promise<PulsoDaPlataforma> {
    return this.pulso.medir();
  }

  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Get("pulso/diretoria")
  medirParaDiretoria(): Promise<PulsoDaPlataforma> {
    return this.pulso.medir();
  }
}
