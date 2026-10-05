import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { FunilService, type FunilDaRotta } from "./funil.service";

import { Public } from "@/common/decorators/public.decorator";
import { DiretoriaReadGuard } from "@/modules/client-errors/diretoria-read.guard";

/**
 * Leitura do funil para a diretoria de agentes (ver `empresa/` na raiz).
 *
 * Mesmo desenho do plantão de erro do CTO, e pelas mesmas razões: um
 * turno agendado roda sozinho, sem ninguém para digitar senha, e dar a
 * ele uma conta de admin seria dar a plataforma inteira. `@Public()`
 * tira o JWT do caminho e quem autentica é o `DiretoriaReadGuard`, pelo
 * segredo de cabeçalho `x-rotta-diretoria-token`. Sem o segredo
 * configurado, recusa tudo.
 *
 * Só leitura, e só contagem: nada aqui identifica ninguém.
 */
@ApiExcludeController()
@Controller("marketing")
export class MarketingController {
  constructor(private readonly funil: FunilService) {}

  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Get("funil")
  levantarFunil(): Promise<FunilDaRotta> {
    return this.funil.levantar();
  }
}
