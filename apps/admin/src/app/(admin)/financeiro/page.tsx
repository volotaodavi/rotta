"use client";

import { Building2, DollarSign, ReceiptText, TrendingUp, Wallet } from "@rotta/icons";
import { Badge, Card, ErrorState, Skeleton, StatTile, Typography } from "@rotta/ui/web";

import type { BillingProviderOverview } from "@rotta/api-client";

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
  label,
  value,
  hidden,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string | null;
  hidden: boolean;
}): JSX.Element {
  return (
    <StatTile
      icon={icon}
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
            label="Recebido"
            value={
              overview.totalRecebidoCentavos === null
                ? "-"
                : hidden
                  ? "R$ ••••••"
                  : centsToBRL(overview.totalRecebidoCentavos)
            }
          />
          <StatTile
            label="Taxa retida"
            value={
              overview.totalTaxaRetidaCentavos === null
                ? "-"
                : hidden
                  ? "R$ ••••••"
                  : centsToBRL(overview.totalTaxaRetidaCentavos)
            }
          />
          <StatTile
            label="Cobranças pagas"
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
          Mensalidade da plataforma (R$ 39,90/mês) — Pix via AbacatePay, cartão/débito/boleto via
          Asaas.
        </Typography>
      </div>

      {(!data.abacatepay.configured || !data.asaas.configured) && (
        <Card>
          <Card.Body className="flex flex-col gap-2">
            {!data.abacatepay.configured && (
              <div className="flex items-center gap-2">
                <Badge variant="warning">AbacatePay não configurada</Badge>
                <Typography variant="bodySmall" color="muted">
                  Sem <code>ABACATEPAY_API_KEY</code> — valores de Pix não podem ser consultados.
                </Typography>
              </div>
            )}
            {!data.asaas.configured && (
              <div className="flex items-center gap-2">
                <Badge variant="warning">Asaas não configurada</Badge>
                <Typography variant="bodySmall" color="muted">
                  Sem <code>ASAAS_API_KEY</code> — valores de cartão/boleto não podem ser
                  consultados.
                </Typography>
              </div>
            )}
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
          label="Total recebido"
          value={
            data.totalRecebidoCentavos === null ? null : centsToBRL(data.totalRecebidoCentavos)
          }
          hidden={hidden}
        />
        <ValorTile
          icon={ReceiptText}
          label="Taxa retida pela AbacatePay"
          value={
            data.totalTaxaRetidaCentavos === null ? null : centsToBRL(data.totalTaxaRetidaCentavos)
          }
          hidden={hidden}
        />
        <ValorTile
          icon={DollarSign}
          label="Cobranças pagas"
          value={
            data.quantidadeCobrancasPagas === null
              ? null
              : data.quantidadeCobrancasPagas.toLocaleString("pt-BR")
          }
          hidden={false}
        />
        <ValorTile
          icon={Building2}
          label="Empresas ativas no plano"
          value={data.quantidadeEmpresasAtivas.toLocaleString("pt-BR")}
          hidden={false}
        />
        <ValorTile
          icon={TrendingUp}
          label="Lucro líquido (recebido − taxas)"
          value={data.lucroLiquidoCentavos === null ? null : centsToBRL(data.lucroLiquidoCentavos)}
          hidden={hidden}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderCard
          titulo="AbacatePay (Pix)"
          descricao="Assinatura via Pix — cobrança recorrente embutida na Rotta."
          overview={data.abacatepay}
          hidden={hidden}
        />
        <ProviderCard
          titulo="Asaas (Cartão e Boleto)"
          descricao="Checkout próprio da Rotta — cartão de crédito, débito e boleto processados pela Asaas."
          overview={data.asaas}
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
        <Card.Header title="Empresas usando o plano" />
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
                  <div
                    key={empresa.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <Typography variant="bodySmall" className="font-medium">
                        {empresa.nomeFantasia}
                      </Typography>
                      <Typography variant="caption" color="muted">
                        {empresa.razaoSocial} · ativa desde{" "}
                        {new Date(empresa.ativaDesde).toLocaleDateString("pt-BR")}
                      </Typography>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="neutral">{empresa.planoNome}</Badge>
                      {empresa.abacatepaySubscriptionId && (
                        <Badge variant="info">Pix (AbacatePay)</Badge>
                      )}
                      {empresa.asaasSubscriptionId && (
                        <Badge variant="info">Cartão/Boleto (Asaas)</Badge>
                      )}
                      {!empresa.abacatepaySubscriptionId && !empresa.asaasSubscriptionId && (
                        <Badge variant="warning">Sem assinatura recorrente</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
