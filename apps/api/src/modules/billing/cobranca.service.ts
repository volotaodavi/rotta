import { Injectable, Logger } from "@nestjs/common";
import { CompanyStatus } from "@prisma/client";

import { ROTTA_SUBSCRIPTION_PRICE_CENTS } from "./billing.constants";

import { PrismaService } from "@/infra/database/prisma.service";
import { EmailService } from "@/infra/email/email.service";

/**
 * Canais pelos quais a Rotta cobra. Autorizados pelo fundador em
 * 05/10/2026: "pode cobrar por financeiro@rottabr.com.br e WhatsApp
 * (21) 99709-9557".
 *
 * Nenhum dos dois é segredo: são o endereço e o telefone públicos do
 * financeiro, e aparecem no corpo da mensagem que o cliente recebe. O
 * remetente já era o padrão do `EmailConfig`; o WhatsApp entra como
 * caminho de resposta, porque quem está devendo quase sempre quer
 * explicar alguma coisa, e obrigar essa pessoa a responder um e-mail
 * perde conversa que o WhatsApp ganharia.
 */
const WHATSAPP_DO_FINANCEIRO = "5521997099557";
const WHATSAPP_VISIVEL = "(21) 99709-9557";

/** Quantos dias entre uma cobrança e a seguinte para a mesma empresa. */
const INTERVALO_EM_DIAS = 3;

export interface PendenciaFinanceira {
  companyId: string;
  nomeFantasia: string;
  status: CompanyStatus;
  /** Dias desde que a empresa entrou no estado atual, quando dá para saber. */
  desdeEmDias: number | null;
  valorEmCentavos: number;
  ultimaCobrancaEm: string | null;
  podeCobrarAgora: boolean;
}

export interface ResultadoDaCobranca {
  avaliadas: number;
  enviadas: number;
  puladas: number;
  falhas: number;
}

/**
 * A régua de cobrança do financeiro.
 *
 * ## O que ela faz, e o que deliberadamente não faz
 *
 * Faz: encontrar quem está inadimplente ou suspenso, e mandar um e-mail
 * do `financeiro@rottabr.com.br` dizendo o que está em aberto e como
 * resolver, com o WhatsApp do financeiro como caminho de resposta.
 *
 * Não faz: cobrar de novo no cartão, gerar boleto, estornar, cancelar
 * assinatura ou suspender acesso. Quem mexe em dinheiro é a Asaas, e
 * quem decide suspender é o fundador. A carta do CFO
 * (`empresa/cargos/cfo.md`) diz isso com todas as letras, e este
 * serviço é a mesma regra em código: ele comunica, não executa.
 *
 * ## Por que existe intervalo entre cobranças
 *
 * Porque uma régua que dispara todo dia vira spam, e spam de cobrança é
 * o jeito mais rápido de perder um cliente que só esqueceu de pagar.
 * `ultimaCobrancaEm` guarda a última, e três dias é o intervalo mínimo.
 *
 * ## Por que o envio é best-effort
 *
 * Esta rotina roda agendada, sem ninguém olhando. Uma falha de e-mail
 * não pode derrubar o processamento das outras empresas nem deixar o
 * carimbo gravado como se tivesse enviado: o carimbo só é escrito
 * depois que o provedor aceita a mensagem.
 */
@Injectable()
export class CobrancaService {
  private readonly logger = new Logger(CobrancaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /** Quem está devendo, e quem já pode receber uma cobrança nova. */
  async levantarPendencias(): Promise<PendenciaFinanceira[]> {
    const limite = new Date(Date.now() - INTERVALO_EM_DIAS * 24 * 60 * 60 * 1000);

    return this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, async () => {
      const empresas = await this.prisma.company.findMany({
        where: { status: { in: [CompanyStatus.INADIMPLENTE, CompanyStatus.SUSPENSO] } },
        select: {
          id: true,
          nomeFantasia: true,
          status: true,
          updatedAt: true,
          ultimaCobrancaEm: true,
        },
        orderBy: { updatedAt: "asc" },
      });

      return empresas.map((empresa) => ({
        companyId: empresa.id,
        nomeFantasia: empresa.nomeFantasia,
        status: empresa.status,
        desdeEmDias: Math.floor((Date.now() - empresa.updatedAt.getTime()) / 86_400_000),
        valorEmCentavos: ROTTA_SUBSCRIPTION_PRICE_CENTS,
        ultimaCobrancaEm: empresa.ultimaCobrancaEm?.toISOString() ?? null,
        podeCobrarAgora: !empresa.ultimaCobrancaEm || empresa.ultimaCobrancaEm < limite,
      }));
    });
  }

  /** Manda a cobrança para quem está em aberto e ainda não foi avisado nesta janela. */
  async cobrarPendencias(): Promise<ResultadoDaCobranca> {
    const pendencias = await this.levantarPendencias();
    const resultado: ResultadoDaCobranca = {
      avaliadas: pendencias.length,
      enviadas: 0,
      puladas: 0,
      falhas: 0,
    };

    for (const pendencia of pendencias) {
      if (!pendencia.podeCobrarAgora) {
        resultado.puladas += 1;
        continue;
      }

      const enviado = await this.cobrarUma(pendencia);
      if (enviado) resultado.enviadas += 1;
      else resultado.falhas += 1;
    }

    this.logger.log(
      `Cobrança: ${resultado.enviadas} enviada(s), ${resultado.puladas} pulada(s), ${resultado.falhas} falha(s) de ${resultado.avaliadas}.`,
    );
    return resultado;
  }

  private async cobrarUma(pendencia: PendenciaFinanceira): Promise<boolean> {
    try {
      const empresa = await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
        this.prisma.company.findUnique({
          where: { id: pendencia.companyId },
          select: { email: true, nomeFantasia: true },
        }),
      );

      if (!empresa?.email) {
        this.logger.warn(`Empresa ${pendencia.companyId} sem e-mail: cobrança não enviada.`);
        return false;
      }

      await this.emailService.sendEmail(
        empresa.email,
        "Sua assinatura da Rotta está em aberto",
        this.montarMensagem(empresa.nomeFantasia, pendencia),
        "financeiro",
      );

      /*
        O carimbo só vai depois do envio aceito. Gravar antes faria uma
        falha de provedor silenciar a empresa por três dias sem que
        ninguém tivesse sido avisado de nada.
      */
      await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
        this.prisma.company.update({
          where: { id: pendencia.companyId },
          data: { ultimaCobrancaEm: new Date() },
        }),
      );

      return true;
    } catch (erro) {
      this.logger.warn(
        `Cobrança da empresa ${pendencia.companyId} falhou: ${(erro as Error).message}`,
      );
      return false;
    }
  }

  /**
   * O texto que o cliente recebe.
   *
   * Escrito para uma transportadora pequena que trabalha com caderno e
   * WhatsApp, não para um departamento financeiro: diz o que aconteceu,
   * quanto é, o que fazer e com quem falar, nessa ordem, sem ameaça e
   * sem juridiquês. Quem está devendo quase sempre esqueceu, e um
   * primeiro contato agressivo transforma um atraso de três dias num
   * cancelamento.
   */
  private montarMensagem(nome: string, pendencia: PendenciaFinanceira): string {
    const valor = (pendencia.valorEmCentavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    const suspensa = pendencia.status === CompanyStatus.SUSPENSO;

    return `
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937; max-width: 540px;">
  <p>Olá, ${this.escapar(nome)}.</p>

  <p>
    A mensalidade da Rotta está em aberto e, por isso, a conta de vocês está
    marcada como <strong>${suspensa ? "suspensa" : "pagamento pendente"}</strong>.
  </p>

  <p style="background: #f1f5f9; border-radius: 8px; padding: 12px 14px;">
    Valor da mensalidade: <strong>${valor}</strong>
  </p>

  <p>
    Para regularizar, entre no painel da Rotta e abra a área de assinatura. O Pix
    aparece na hora e a confirmação é automática, normalmente em poucos minutos.
    ${suspensa ? "Assim que o pagamento cair, o acesso volta sozinho." : ""}
  </p>

  <p>
    Se o pagamento já foi feito, ou se houver qualquer coisa a acertar, responda este
    e-mail ou fale com a gente no WhatsApp
    <a href="https://wa.me/${WHATSAPP_DO_FINANCEIRO}" style="color: #3B6EF6; font-weight: 600;">${WHATSAPP_VISIVEL}</a>.
    A gente resolve junto.
  </p>

  <p style="color: #6b7280; font-size: 13px; margin-top: 28px;">
    Rotta, financeiro<br>
    financeiro@rottabr.com.br, WhatsApp ${WHATSAPP_VISIVEL}
  </p>
</div>`.trim();
  }

  /** Nome de empresa entra em HTML: escapar não é paranoia, é o mínimo. */
  private escapar(texto: string): string {
    return texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
