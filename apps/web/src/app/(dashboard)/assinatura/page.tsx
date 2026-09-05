"use client";

import { Copy } from "@rotta/icons";
import { Button, Card, FormField, Input, Typography, useToast } from "@rotta/ui/web";
import { useState } from "react";

import type { AsaasBillingType, AsaasPayment, PixCheckout } from "@rotta/api-client";

import { AsaasSecurityBadge } from "@/components/asaas-security-badge";
import { PixCheckoutModal } from "@/features/billing/components/pix-checkout-modal";
import {
  useAsaasCheckoutStatus,
  useCreateAsaasCheckout,
  useCreatePixCheckout,
} from "@/features/company/hooks/use-company";

type Metodo = "PIX" | AsaasBillingType;

const METODOS: Array<{ id: Metodo; label: string }> = [
  { id: "PIX", label: "Pix" },
  { id: "CREDIT_CARD", label: "Cartão de crédito" },
  { id: "DEBIT_CARD", label: "Cartão de débito" },
  { id: "BOLETO", label: "Boleto" },
];

/**
 * Checkout próprio da Rotta (Dossiê 26, faturamento) — página que
 * `TrialLockModal`/`BillingBlockScreen` linkam pra "Assinar agora".
 * 100% Asaas por trás (Pix via `PixCheckoutModal`, cartão/débito/
 * boleto via `createAsaasCheckout`) — o usuário só escolhe o método de
 * pagamento, nunca precisa saber qual provedor processa.
 */
export default function AssinaturaPage(): JSX.Element {
  const toast = useToast();
  const [metodo, setMetodo] = useState<Metodo>("PIX");

  const createPixCheckout = useCreatePixCheckout();
  const [pixCheckout, setPixCheckout] = useState<PixCheckout | null>(null);

  const createAsaasCheckout = useCreateAsaasCheckout();
  const [asaasPayment, setAsaasPayment] = useState<AsaasPayment | null>(null);
  const { data: asaasStatus } = useAsaasCheckoutStatus(
    asaasPayment?.id,
    Boolean(asaasPayment) && asaasPayment?.status === "PENDING",
  );
  const pagamentoAtual = asaasStatus ?? asaasPayment;

  const [cartao, setCartao] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });
  const [titular, setTitular] = useState({
    name: "",
    email: "",
    cpfCnpj: "",
    postalCode: "",
    addressNumber: "",
  });
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  async function pagarComPix(): Promise<void> {
    try {
      const result = await createPixCheckout.mutateAsync();
      setPixCheckout(result);
    } catch {
      toast.error("Não foi possível gerar o Pix. Tente novamente.");
    }
  }

  async function assinarComAsaas(): Promise<void> {
    try {
      const result = await createAsaasCheckout.mutateAsync({
        billingType: metodo as AsaasBillingType,
        ...(metodo !== "BOLETO" ? { cartao, titular } : {}),
      });
      setAsaasPayment(result);
    } catch {
      toast.error("Não foi possível processar o pagamento. Confira os dados e tente novamente.");
    }
  }

  async function copiarLinhaDigitavel(): Promise<void> {
    if (!pagamentoAtual?.identificationField) return;
    await navigator.clipboard.writeText(pagamentoAtual.identificationField);
    setCodigoCopiado(true);
    setTimeout(() => setCodigoCopiado(false), 2000);
  }

  const cartaoFormPreenchido =
    cartao.holderName &&
    cartao.number &&
    cartao.expiryMonth &&
    cartao.expiryYear &&
    cartao.ccv &&
    titular.name &&
    titular.email &&
    titular.cpfCnpj &&
    titular.postalCode &&
    titular.addressNumber;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Typography variant="title">Assinar o plano Starter</Typography>
        <Typography variant="body" color="muted">
          R$ 39,90/mês, sem adicional. Escolha como prefere pagar.
        </Typography>
      </div>

      <div className="flex flex-wrap gap-2">
        {METODOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMetodo(item.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              metodo === item.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-text hover:border-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {metodo === "PIX" && (
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <Typography variant="subtitle">Pagar com Pix</Typography>
            <Typography variant="bodySmall" color="muted">
              QR Code + copia-e-cola, confirmação automática — sem sair desta tela.
            </Typography>
            <Button
              isLoading={createPixCheckout.isPending}
              onClick={() => void pagarComPix()}
              className="self-start"
            >
              Gerar Pix
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* 100% Asaas por trás de qualquer método (Pix incluso, desde a
          migração 05/09/2026) — o selo aparece sempre. */}
      <AsaasSecurityBadge />

      {(metodo === "CREDIT_CARD" || metodo === "DEBIT_CARD") &&
        (pagamentoAtual ? (
          <CartaoStatusCard payment={pagamentoAtual} />
        ) : (
          <Card>
            <Card.Body className="flex flex-col gap-4">
              <Typography variant="subtitle">
                Dados do {metodo === "CREDIT_CARD" ? "cartão de crédito" : "cartão de débito"}
              </Typography>
              <FormField label="Nome impresso no cartão" isRequired>
                <Input
                  value={cartao.holderName}
                  onChange={(e) => setCartao({ ...cartao, holderName: e.target.value })}
                  placeholder="JOÃO DA SILVA"
                />
              </FormField>
              <FormField label="Número do cartão" isRequired>
                <Input
                  inputMode="numeric"
                  value={cartao.number}
                  onChange={(e) => setCartao({ ...cartao, number: e.target.value })}
                  placeholder="0000 0000 0000 0000"
                />
              </FormField>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Mês" isRequired>
                  <Input
                    inputMode="numeric"
                    value={cartao.expiryMonth}
                    onChange={(e) => setCartao({ ...cartao, expiryMonth: e.target.value })}
                    placeholder="MM"
                  />
                </FormField>
                <FormField label="Ano" isRequired>
                  <Input
                    inputMode="numeric"
                    value={cartao.expiryYear}
                    onChange={(e) => setCartao({ ...cartao, expiryYear: e.target.value })}
                    placeholder="AAAA"
                  />
                </FormField>
                <FormField label="CVV" isRequired>
                  <Input
                    inputMode="numeric"
                    value={cartao.ccv}
                    onChange={(e) => setCartao({ ...cartao, ccv: e.target.value })}
                    placeholder="123"
                  />
                </FormField>
              </div>

              <Typography variant="subtitle" className="mt-2">
                Dados do titular
              </Typography>
              <FormField label="Nome completo" isRequired>
                <Input
                  value={titular.name}
                  onChange={(e) => setTitular({ ...titular, name: e.target.value })}
                />
              </FormField>
              <FormField label="E-mail" isRequired>
                <Input
                  type="email"
                  value={titular.email}
                  onChange={(e) => setTitular({ ...titular, email: e.target.value })}
                />
              </FormField>
              <FormField label="CPF ou CNPJ" isRequired>
                <Input
                  value={titular.cpfCnpj}
                  onChange={(e) => setTitular({ ...titular, cpfCnpj: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="CEP" isRequired>
                  <Input
                    value={titular.postalCode}
                    onChange={(e) => setTitular({ ...titular, postalCode: e.target.value })}
                  />
                </FormField>
                <FormField label="Número do endereço" isRequired>
                  <Input
                    value={titular.addressNumber}
                    onChange={(e) => setTitular({ ...titular, addressNumber: e.target.value })}
                  />
                </FormField>
              </div>

              <Button
                isLoading={createAsaasCheckout.isPending}
                disabled={!cartaoFormPreenchido}
                onClick={() => void assinarComAsaas()}
              >
                Assinar por R$ 39,90/mês
              </Button>
            </Card.Body>
          </Card>
        ))}

      {metodo === "BOLETO" &&
        (pagamentoAtual ? (
          <BoletoResultCard
            payment={pagamentoAtual}
            copiado={codigoCopiado}
            onCopiar={() => void copiarLinhaDigitavel()}
          />
        ) : (
          <Card>
            <Card.Body className="flex flex-col gap-3">
              <Typography variant="subtitle">Pagar com boleto</Typography>
              <Typography variant="bodySmall" color="muted">
                Gera um boleto com linha digitável e link para o PDF — o pagamento é confirmado em
                até 2 dias úteis após a compensação bancária.
              </Typography>
              <Button
                isLoading={createAsaasCheckout.isPending}
                onClick={() => void assinarComAsaas()}
                className="self-start"
              >
                Gerar boleto
              </Button>
            </Card.Body>
          </Card>
        ))}

      {pixCheckout && (
        <PixCheckoutModal checkout={pixCheckout} onClose={() => setPixCheckout(null)} />
      )}
    </div>
  );
}

function CartaoStatusCard({ payment }: { payment: AsaasPayment }): JSX.Element {
  if (payment.status === "CONFIRMED" || payment.status === "RECEIVED") {
    return (
      <Card>
        <Card.Body>
          <Typography variant="body" color="success" className="py-8 text-center">
            Pagamento confirmado! Sua assinatura já está ativa.
          </Typography>
        </Card.Body>
      </Card>
    );
  }
  if (payment.status === "PENDING") {
    return (
      <Card>
        <Card.Body>
          <Typography variant="body" color="muted" className="py-8 text-center">
            Processando o pagamento do cartão…
          </Typography>
        </Card.Body>
      </Card>
    );
  }
  return (
    <Card>
      <Card.Body>
        <Typography variant="body" color="danger" className="py-8 text-center">
          Não foi possível confirmar o cartão ({payment.status.toLowerCase()}). Tente novamente com
          outro cartão.
        </Typography>
      </Card.Body>
    </Card>
  );
}

function BoletoResultCard({
  payment,
  copiado,
  onCopiar,
}: {
  payment: AsaasPayment;
  copiado: boolean;
  onCopiar: () => void;
}): JSX.Element {
  if (payment.status === "CONFIRMED" || payment.status === "RECEIVED") {
    return (
      <Card>
        <Card.Body>
          <Typography variant="body" color="success" className="py-8 text-center">
            Pagamento confirmado! Sua assinatura já está ativa.
          </Typography>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body className="flex flex-col gap-3">
        <Typography variant="subtitle">Boleto gerado</Typography>
        <Typography variant="bodySmall" color="muted">
          Pague em qualquer banco, app ou lotérica até o vencimento.
        </Typography>
        {payment.identificationField && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted p-3">
            <Typography variant="bodySmall" className="flex-1 break-all font-mono">
              {payment.identificationField}
            </Typography>
            <Button variant="ghost" onClick={onCopiar} className="shrink-0">
              <Copy className="h-4 w-4" />
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        )}
        {payment.bankSlipUrl && (
          <a
            href={payment.bankSlipUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary underline"
          >
            Baixar PDF do boleto
          </a>
        )}
        <Typography variant="caption" color="muted">
          Aguardando confirmação do pagamento…
        </Typography>
      </Card.Body>
    </Card>
  );
}
