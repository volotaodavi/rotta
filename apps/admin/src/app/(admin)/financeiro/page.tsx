"use client";

import { useAuth } from "@rotta/auth/web";
import { Building2, DollarSign, ReceiptText, TrendingUp, Wallet } from "@rotta/icons";
import { Badge, Card, ErrorState, Skeleton, StatTile, Typography } from "@rotta/ui/web";

import type { BillingProviderOverview } from "@rotta/api-client";

import { AsaasAccountSection } from "@/features/billing/components/asaas-account-section";
import { CompanyPaymentHistoryRow } from "@/features/billing/components/company-payment-history-row";
import { useBillingAdminOverview } from "@/features/billing/hooks/use-billing";
import { usePrivacy } from "@/providers/privacy-provider";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Cartão de um valor financeiro agregado (recebido/taxa retida/cobranças
 * pagas). Quando a AbacatePay não está configurada nesta implantação
 * (`abacatepayConfigured === false`) ou a consulta a `billing/list`
 * falhou, o valor vem `null` — mostra "-", nunca um `0` fabricado (nunca
 * fingir um valor que não temos).
 */
function ValorTile({
  icon,
  tone,
  label,
  value,
  hidden,
}: {
  icon: typeof DollarSign;
  tone: "primary" | "success" | "warning" | "danger" | "info";
  label: string;
  value: string | null;
  hidden: boolean;
}): JSX.Element {
  return (
    <StatTile
      icon={icon}
      tone={tone}
      label={label}
      value={value === null ? "-" : hidden ? "R$ ••••••" : value}
    />
  );
}

/**
 * Bloco de valores de UM provedor (AbacatePay ou Asaas), lado a lado no
 * painel (pedido do usuário: "taxas da Asaas, quanto as taxas da
 * Abacatepay (pix)"). Quando `configured === false`, mostra o aviso em
 * vez de valores fabricados.
 */
function ProviderCard({
  titulo,
  descricao,
  overview,
  hidden,
}: {
  titulo: string;
  descricao: string;
  overview: BillingProviderOverview;
  hidden: boolean;
}): JSX.Element {
  return (
    <Card>
      <Card.Header
        title={titulo}
        action={!overview.configured && <Badge variant="warning">Não configurada</Badge>}
      />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="caption" color="muted">
          {descricao}
        </Typography>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            icon={Wallet}
            tone="success"
            label="Recebido hoje"
            value={
              overview.totalRecebidoCentavos === null
                ? "-"
                : hidden
                  ? "R$ ••••••"
                  : centsToBRL(overview.totalRecebidoCentavos)
            }
          />
          <StatTile
            icon={ReceiptText}
            tone="warning"
            label="Taxa retida hoje"
            value={
              overview.totalTaxaRetidaCentavos === null
                ? "-"
                : hidden
                  ? "R$ ••••••"
                  : centsToBRL(overview.totalTaxaRetidaCentavos)
            }
          />
          <StatTile
            icon={DollarSign}
            tone="info"
            label="Cobranças pagas hoje"
            value={
              overview.quantidadeCobrancasPagas === null
                ? "-"
                : overview.quantidadeCobrancasPagas.toLocaleString("pt-BR")
            }
          />
        </div>
      </Card.Body>
    </Card>
  );
}

/** Esqueleto do carregamento inicial — mesma disciplina de Home/Inteligência (pedido do usuário 02/09/2026: "trazer mais modernidade"). */
function FinanceiroSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={140} height={32} />
        <Skeleton variant="text" width={320} height={16} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant="rect" height={80} />
        ))}
      </div>
    </div>
  );
}

/**
 * Painel financeiro da mensalidade da plataforma (pedido do usuário:
 * "mostrar no painel do admin os valores recebidos, as taxas que a
 * abacatepay retrai + quantidade de empresas + quantidade de planos que
 * estão usando + quais empresas estão usando o plano"). Todo número vem
 * de `GET /billing/admin/overview` (real) — quando a AbacatePay não está
 * configurada, ou a consulta a `billing/list` falha, os campos de
 * valores vêm `null` e a tela mostra isso explicitamente, sem fabricar
 * dado nenhum.
 */
export default function FinanceiroPage(): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useBillingAdminOverview();
  const { hidden } = usePrivacy();
  const { user } = useAuth();
  // Sem `adminPapel` (ex. token antigo) cai no default seguro do resto do
  // sistema (GERAL) — mesmo raciocínio de `AdminAreaGuard`/`AdminSidebar`.
  const podeTransferir = (user?.adminPapel ?? "GERAL") === "GERAL";

  if (isLoading) {
    return <FinanceiroSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card>
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar o painel financeiro."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="display">Financeiro</Typography>
        <Typography variant="bodySmall" color="muted">
          Mensalidade da plataforma (R$ 39,90/mês), 100% via Asaas — Pix, cartão, débito e boleto.
          Todos os números e o extrato abaixo contam só a partir de hoje (00h); o saldo é sempre o
          saldo atual de verdade da conta.
        </Typography>
      </div>

      {!data.asaas.configured && (
        <Card>
          <Card.Body className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="warning">Asaas não configurada</Badge>
              <Typography variant="bodySmall" color="muted">
                Sem <code>ASAAS_API_KEY</code> — valores de Pix/cartão/boleto não podem ser
                consultados.
              </Typography>
            </div>
            <Typography variant="caption" color="muted">
              Empresas e planos abaixo continuam corretos (vêm do banco da Rotta, não dos
              provedores).
            </Typography>
          </Card.Body>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ValorTile
          icon={Wallet}
          tone="success"
          label="Recebido hoje"
          value={
            data.totalRecebidoCentavos === null ? null : centsToBRL(data.totalRecebidoCentavos)
          }
          hidden={hidden}
        />
        <ValorTile
          icon={ReceiptText}
          tone="warning"
          label="Taxa retida hoje (AbacatePay + Asaas)"
          value={
            data.totalTaxaRetidaCentavos === null ? null : centsToBRL(data.totalTaxaRetidaCentavos)
          }
          hidden={hidden}
        />
        <ValorTile
          icon={DollarSign}
          tone="info"
          label="Cobranças pagas hoje"
          value={
            data.quantidadeCobrancasPagas === null
              ? null
              : data.quantidadeCobrancasPagas.toLocaleString("pt-BR")
          }
          hidden={false}
        />
        <ValorTile
          icon={Building2}
          tone="primary"
          label="Empresas ativas no plano"
          value={data.quantidadeEmpresasAtivas.toLocaleString("pt-BR")}
          hidden={false}
        />
        <ValorTile
          icon={TrendingUp}
          tone="success"
          label="Lucro líquido hoje (recebido − taxas)"
          value={data.lucroLiquidoCentavos === null ? null : centsToBRL(data.lucroLiquidoCentavos)}
          hidden={hidden}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderCard
          titulo="Asaas (Pix, Cartão e Boleto)"
          descricao="Checkout próprio da Rotta — Pix, cartão de crédito, débito e boleto, tudo processado pela Asaas."
          overview={data.asaas}
          hidden={hidden}
        />
        <ProviderCard
          titulo="AbacatePay (legado)"
          descricao="Pix passou a ser 100% Asaas (pedido do usuário 03/09/2026) — a AbacatePay só aparece aqui se ainda houver uma assinatura antiga dela em aberto, nenhum Pix novo passa mais por ela."
          overview={data.abacatepay}
          hidden={hidden}
        />
      </div>

      <Card>
        <Card.Header title="Planos em uso" />
        <Card.Body className="flex flex-wrap items-center gap-3">
          {data.planos.length === 0 ? (
            <Typography variant="bodySmall" color="muted">
              Nenhuma empresa ativa no momento.
            </Typography>
          ) : (
            data.planos.map((plano) => (
              <Badge key={plano.codigo} variant="neutral">
                {plano.nome} · {plano.quantidadeEmpresas}{" "}
                {plano.quantidadeEmpresas === 1 ? "empresa" : "empresas"}
              </Badge>
            ))
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header
          title="Empresas usando o plano"
          action={
            <Typography variant="caption" color="muted">
              Clique numa empresa pra ver os pagamentos dela (a partir de hoje)
            </Typography>
          }
        />
        <Card.Body className="p-0">
          {data.empresasAtivas.length === 0 ? (
            <div className="p-6">
              <Typography variant="bodySmall" color="muted">
                Nenhuma empresa ativa no momento.
              </Typography>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex flex-col divide-y divide-border">
                {data.empresasAtivas.map((empresa) => (
                  <CompanyPaymentHistoryRow key={empresa.id} empresa={empresa} />
                ))}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <AsaasAccountSection podeTransferir={podeTransferir} />
    </div>
  );
}
