import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import {
  CobrancaService,
  type PendenciaFinanceira,
  type ResultadoDaCobranca,
} from "./cobranca.service";

import { Public } from "@/common/decorators/public.decorator";
import { DiretoriaReadGuard } from "@/modules/client-errors/diretoria-read.guard";

/**
 * A régua de cobrança, para o turno do CFO.
 *
 * Autorizado pelo fundador em 05/10/2026: "o CFO analisará toda a
 * questão financeira, inclusive caso haja pendência, ele que entrará em
 * contato". Mesmo desenho do plantão de erro do CTO e do funil do CMO:
 * `@Public()` tira o JWT do caminho, e quem autentica é o segredo de
 * cabeçalho `x-rotta-diretoria-token`.
 *
 * ## Por que a leitura e o envio são rotas separadas
 *
 * Porque são decisões diferentes. `GET /pendencias` só olha, e o CFO
 * pode olhar quantas vezes quiser para escrever o fechamento da semana.
 * `POST /cobrar` manda e-mail para cliente de verdade, e isso acontece
 * uma vez por turno, de propósito. Juntar os dois numa rota só faria
 * toda leitura disparar mensagem.
 *
 * O que esta rota NÃO faz: cobrar no cartão, gerar boleto, estornar,
 * cancelar assinatura ou suspender acesso. Quem mexe em dinheiro é a
 * Asaas e quem decide suspender é o fundador.
 */
@ApiExcludeController()
@Controller("cobranca")
export class CobrancaController {
  constructor(private readonly cobranca: CobrancaService) {}

  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Get("pendencias")
  levantar(): Promise<PendenciaFinanceira[]> {
    return this.cobranca.levantarPendencias();
  }

  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Post("cobrar")
  @HttpCode(HttpStatus.OK)
  cobrar(): Promise<ResultadoDaCobranca> {
    return this.cobranca.cobrarPendencias();
  }
}
