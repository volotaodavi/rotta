import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { lerEncaminhamentoTraccar } from "./traccar-forward.util";
import { TrackerIngestGuard } from "./tracker-ingest.guard";
import { TrackersService } from "./trackers.service";

import type { ResultadoDaPosicao } from "./trackers.service";

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
  private readonly logger = new Logger(TrackersController.name);

  constructor(private readonly trackersService: TrackersService) {}

  /**
   * O corpo entra como `Record<string, unknown>` DE PROPÓSITO, e a
   * validação acontece à mão em `lerEncaminhamentoTraccar`.
   *
   * ## Por que fugir do `ValidationPipe` global aqui
   *
   * O pipe global roda com `whitelist` **e** `forbidNonWhitelisted`
   * (`main.ts`), que é a configuração certa para toda rota com usuário
   * do outro lado: campo a mais vira 400 e o cliente conserta. Aqui o
   * cliente é o Traccar, que não conserta nada e não lê resposta.
   *
   * Tipando o parâmetro como classe, o pipe entrava e recusava o corpo
   * REAL do Traccar com 400, por três motivos ao mesmo tempo: a chave
   * `position`, que embrulha a posição; `device.id` e `device.status`,
   * que o nosso DTO não declara; e as dezenas de atributos do Teltonika
   * (`sat`, `power`, `io239`, `distance`). Eram 400 em 100% das
   * posições de aparelho de verdade, dez retentativas e descarte.
   * Tipando como `Record<string, unknown>`, o pipe não tem metadado de
   * classe para trabalhar e deixa o corpo passar intacto.
   *
   * A validação não sumiu: ela ficou mais tolerante de propósito, e num
   * lugar onde dá para ler a regra inteira de uma vez.
   */
  @Public()
  @UseGuards(TrackerIngestGuard)
  @Post("posicoes")
  @HttpCode(HttpStatus.OK)
  registrarPosicao(@Body() corpo: Record<string, unknown>): Promise<ResultadoDaPosicao> {
    const leitura = lerEncaminhamentoTraccar(corpo);

    if (!leitura.aceita) {
      // `warn` porque é acionável: ou um aparelho novo manda algo que a
      // Rotta não entende, ou alguém está batendo nesta rota à mão. As
      // duas coisas alguém precisa olhar.
      this.logger.warn(`Encaminhamento recusado pelo formato: ${leitura.motivo}`);
      return Promise.resolve({ aceita: false, motivo: leitura.motivo });
    }

    return this.trackersService.registrarPosicao(leitura.payload);
  }
}
