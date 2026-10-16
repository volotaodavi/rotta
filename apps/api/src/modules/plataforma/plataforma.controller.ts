import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeController } from "@nestjs/swagger";

import { OperacaoService, type OperacaoDaPlataforma } from "./operacao.service";
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
  constructor(
    private readonly pulso: PulsoService,
    private readonly operacao: OperacaoService,
  ) {}

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

  /**
   * A operação, nas mesmas duas portas e pelo mesmo motivo.
   *
   * Separado do pulso de propósito: a `carga` do pulso existe para
   * animar o escritório 3D e não tem significado de negócio, enquanto
   * estes números respondem se a Rotta funcionou. Juntar os dois numa
   * resposta só convidaria alguém a tratar `carga` como indicador.
   */
  @ApiBearerAuth()
  @Roles(Role.ADMIN_ROTTA)
  @Get("operacao")
  medirOperacao(): Promise<OperacaoDaPlataforma> {
    return this.operacao.medir();
  }

  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Get("operacao/diretoria")
  medirOperacaoParaDiretoria(): Promise<OperacaoDaPlataforma> {
    return this.operacao.medir();
  }
}
