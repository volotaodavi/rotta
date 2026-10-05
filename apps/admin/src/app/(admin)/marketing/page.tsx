"use client";

import { Badge, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";

import { usePreCadastros } from "@/features/account-deletion/hooks/use-account-deletion";
import { useBackofficeDashboard } from "@/features/backoffice/hooks/use-backoffice";
import { LINKS_DA_DIRETORIA, useGovernanca } from "@/features/diretoria/hooks/use-diretoria";

/**
 * Marketing (Admin Geral) — pedido do fundador em 05/10/2026: "pode
 * criar um subgrupo denominado marketing, que aí vamos poder analisar
 * as métricas juntos e trazer soluções eficientes".
 *
 * A tela existe para responder uma pergunta que nenhuma outra responde:
 * **onde o dinheiro de anúncio vai se perder**. Ela não mostra métrica
 * do Meta Ads (nenhuma conta de anúncio está ligada aqui ainda, e
 * inventar número seria o pior erro possível numa tela de campanha).
 * Mostra o que a própria plataforma sabe: quantas transportadoras
 * existem, quantas pagam, e quantas pessoas chegaram perto de virar
 * cliente e pararam no caminho.
 *
 * O funil vem de dois lugares reais: o painel do Backoffice (empresas
 * por status) e a lista de pré-cadastros (checkout do site que nunca
 * virou conta). O estado da medição vem do código: são os eventos que
 * `apps/web/src/features/marketing/tracking.ts` dispara de verdade.
 */

/** Os eventos que o site dispara hoje, e de onde cada um sai. Espelha `tracking.ts`. */
const EVENTOS_INSTRUMENTADOS = [
  { evento: "pagina_vista", meta: "PageView", onde: "Todas as páginas públicas e de cadastro" },
  { evento: "checkout_aberto", meta: "InitiateCheckout", onde: "Pix gerado em /planos/assinar" },
  {
    evento: "assinatura_paga",
    meta: "Purchase (com valor)",
    onde: "Webhook do Asaas confirmou o pagamento",
  },
  {
    evento: "cadastro_concluido",
    meta: "Lead",
    onde: "Conta de responsável criada com sucesso",
  },
] as const;

const VARIAVEIS = [
  {
    nome: "FACEBOOK_DOMAIN_VERIFICATION",
    onde: "Meta, Segurança da marca, Domínios",
    exemplo: "libera a priorização de eventos",
  },
  {
    nome: "NEXT_PUBLIC_GOOGLE_ADS_ID",
    onde: "Google Ads, tag de conversão",
    exemplo: "AW-XXXXXXXXXX",
  },
  { nome: "NEXT_PUBLIC_GA_MEASUREMENT_ID", onde: "Google Analytics 4", exemplo: "G-XXXXXXXXXX" },
] as const;

function Numero({
  valor,
  rotulo,
  nota,
  variante,
}: {
  valor: number | string;
  rotulo: string;
  nota: string;
  variante?: "atencao" | "bom";
}): JSX.Element {
  return (
    <Card>
      <Card.Body className="flex flex-col gap-1">
        <Typography
          variant="title"
          color={variante === "atencao" ? "danger" : variante === "bom" ? "success" : undefined}
        >
          {valor}
        </Typography>
        <Typography variant="bodySmall">{rotulo}</Typography>
        <Typography variant="caption" color="muted">
          {nota}
        </Typography>
      </Card.Body>
    </Card>
  );
}

export default function MarketingPage(): JSX.Element {
  const dashboard = useBackofficeDashboard();
  const preCadastros = usePreCadastros({ limit: 100 });
  const governanca = useGovernanca();

  const porStatus = dashboard.data?.empresasPorStatus ?? {};
  const pagas = porStatus.ATIVO ?? 0;
  const emTeste = porStatus.TRIAL ?? 0;
  const inadimplentes = (porStatus.INADIMPLENTE ?? 0) + (porStatus.SUSPENSO ?? 0);

  const pagosSemConta = preCadastros.data?.items.filter((item) => item.pagoEm !== null) ?? [];
  const dinheiroParado = pagosSemConta.reduce((soma, item) => soma + item.valorCentavos, 0);
  const abandonados = preCadastros.data?.items.filter((item) => item.pagoEm === null).length ?? 0;

  /** O que o CFO deixou endereçado ao CMO no backlog. */
  const recadosParaMarketing =
    governanca.data?.backlog.filter(
      (item) => item.cargo === "CMO" && item.texto.toLowerCase().startsWith("de:"),
    ) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Marketing</Typography>
        <Typography variant="bodySmall" color="muted">
          O funil que a própria plataforma mede, o estado da medição de campanha e o que o CFO
          mandou para o CMO. Ainda não há número vindo do Meta Ads aqui: o Pixel manda evento para
          lá, mas ler desempenho de campanha de volta depende de um token da API de Marketing que
          ainda não existe. Quando existir, é esta tela que recebe.
        </Typography>
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="subtitle">O funil, de verdade</Typography>
        {dashboard.isLoading || preCadastros.isLoading ? (
          <Card>
            <Card.Body className="flex justify-center py-10">
              <Spinner size="md" />
            </Card.Body>
          </Card>
        ) : dashboard.isError ? (
          <Card>
            <Card.Body>
              <ErrorState
                message="Não foi possível carregar os números da plataforma."
                onRetry={() => void dashboard.refetch()}
              />
            </Card.Body>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Numero
              valor={abandonados}
              rotulo="Checkout abandonado"
              nota="Começou a assinar no site e não pagou. É aqui que a campanha perde dinheiro primeiro."
              variante={abandonados > 0 ? "atencao" : undefined}
            />
            <Numero
              valor={pagosSemConta.length}
              rotulo="Pagou e não virou conta"
              nota={`${(dinheiroParado / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} recebidos sem serviço entregue.`}
              variante={pagosSemConta.length > 0 ? "atencao" : undefined}
            />
            <Numero
              valor={emTeste}
              rotulo="Transportadoras em teste"
              nota="Entraram e ainda não pagam. O que as converte é produto, não anúncio."
            />
            <Numero
              valor={pagas}
              rotulo="Transportadoras pagando"
              nota={
                inadimplentes > 0
                  ? `${inadimplentes} inadimplente(s) ou suspensa(s) fora desta conta.`
                  : "Nenhuma inadimplente no momento."
              }
              variante={pagas > 0 ? "bom" : undefined}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="subtitle">A medição da campanha</Typography>
        <Card>
          <Card.Body className="flex flex-col gap-4">
            <Typography variant="bodySmall" color="muted">
              O Pixel do Meta está ligado desde 05/10/2026 e os eventos abaixo saem de momentos
              reais do produto. Eles só disparam depois que a pessoa aceita o aviso de cookies, e
              nunca dentro deste painel: a medição existe apenas nas páginas públicas.
            </Typography>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-semibold">Evento</th>
                    <th className="py-2 pr-4 font-semibold">Vira, no Meta</th>
                    <th className="py-2 font-semibold">Dispara quando</th>
                  </tr>
                </thead>
                <tbody>
                  {EVENTOS_INSTRUMENTADOS.map((linha) => (
                    <tr key={linha.evento} className="border-b border-border/60">
                      <td className="py-2 pr-4">
                        <code>{linha.evento}</code>
                      </td>
                      <td className="py-2 pr-4">{linha.meta}</td>
                      <td className="py-2 text-text-muted">{linha.onde}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2">
              <Typography variant="bodySmall" className="font-semibold">
                O que ainda falta configurar
              </Typography>
              <Typography variant="caption" color="muted">
                Vercel, projeto do site, Settings, Environment Variables. Depois de salvar, um novo
                deploy e pronto. O ID do Pixel não está nesta lista porque já vive no código.
              </Typography>
              {VARIAVEIS.map((variavel) => (
                <div key={variavel.nome} className="flex flex-wrap items-baseline gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{variavel.nome}</code>
                  <Typography variant="caption" color="muted">
                    {variavel.onde} · {variavel.exemplo}
                  </Typography>
                </div>
              ))}
            </div>

            <Typography variant="caption" color="muted">
              Nenhum dado pessoal atravessa para plataforma de anúncio: nome, e-mail, telefone, CPF,
              aluno e posição de veículo ficam de fora, e o rastreamento não existe dentro do painel
              autenticado. O único evento com valor é a assinatura paga, e o valor é o preço do
              próprio plano.
            </Typography>
          </Card.Body>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="subtitle">O que o CFO mandou para o CMO</Typography>
        {governanca.isLoading ? (
          <Card>
            <Card.Body className="flex justify-center py-8">
              <Spinner size="md" />
            </Card.Body>
          </Card>
        ) : recadosParaMarketing.length === 0 ? (
          <Card>
            <Card.Body className="flex flex-col gap-1">
              <Typography variant="body" color="muted">
                Nenhum recado ainda.
              </Typography>
              <Typography variant="caption" color="muted">
                Toda sexta o CFO fecha a semana e deixa aqui quanto entrou e quanto a Rotta pode
                pagar por uma transportadora nova. É esse teto que dimensiona o anúncio.
              </Typography>
            </Card.Body>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recadosParaMarketing.map((recado) => (
              <Card key={recado.texto}>
                <Card.Body className="flex flex-col gap-1">
                  <Badge variant="info">do CFO</Badge>
                  <Typography variant="bodySmall">
                    {recado.texto.replace(/^de:\s*/i, "")}
                  </Typography>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
        <Typography variant="caption" color="muted">
          <a
            href={`${LINKS_DA_DIRETORIA.empresa}/marketing`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Material e planos de campanha do CMO
          </a>
        </Typography>
      </div>
    </div>
  );
}
