"use client";

import { Building2, DollarSign, ReceiptText, Wallet } from "@rotta/icons";
import { Badge, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";

import { useBillingAdminOverview } from "@/features/billing/hooks/use-billing";
import { usePrivacy } from "@/providers/privacy-provider";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Cartão de um valor financeiro agregado (recebido/taxa retida/cobranças
 * pagas). Quando a AbacatePay não está configurada nesta implantação
 * (`abacatepayConfigured === false`) ou a consulta a `billing/list`
 * falhou, o valor vem `null` — mostra "—", nunca um `0` fabricado (nunca
 * fingir um valor que não temos).
 */
function ValorCard({
  icon: Icon,
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
    <Card>
      <Card.Body className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon size={20} />
        </span>
        <div>
          <Typography variant="caption" color="muted">
            {label}
          </Typography>
          <Typography variant="title">
            {value === null ? "—" : hidden ? "R$ ••••••" : value}
          </Typography>
        </div>
      </Card.Body>
    </Card>
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
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
          Mensalidade da plataforma (R$ 39,90/mês) cobrada via AbacatePay.
        </Typography>
      </div>

      {!data.abacatepayConfigured && (
        <Card>
          <Card.Body>
            <Badge variant="warning">AbacatePay não configurada</Badge>
            <Typography variant="bodySmall" color="muted" className="mt-2">
              Esta implantação não tem <code>ABACATEPAY_API_KEY</code> configurada — valores
              recebidos e taxa retida não podem ser consultados. Empresas e planos abaixo continuam
              corretos (vêm do banco da Rotta, não da AbacatePay).
            </Typography>
          </Card.Body>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ValorCard
          icon={Wallet}
          label="Total recebido"
          value={
            data.totalRecebidoCentavos === null ? null : centsToBRL(data.totalRecebidoCentavos)
          }
          hidden={hidden}
        />
        <ValorCard
          icon={ReceiptText}
          label="Taxa retida pela AbacatePay"
          value={
            data.totalTaxaRetidaCentavos === null ? null : centsToBRL(data.totalTaxaRetidaCentavos)
          }
          hidden={hidden}
        />
        <ValorCard
          icon={DollarSign}
          label="Cobranças pagas"
          value={
            data.quantidadeCobrancasPagas === null
              ? null
              : data.quantidadeCobrancasPagas.toLocaleString("pt-BR")
          }
          hidden={false}
        />
        <ValorCard
          icon={Building2}
          label="Empresas ativas no plano"
          value={data.quantidadeEmpresasAtivas.toLocaleString("pt-BR")}
          hidden={false}
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
                      {!empresa.abacatepaySubscriptionId && (
                        <Badge variant="warning">Sem assinatura AbacatePay (via Pix)</Badge>
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
