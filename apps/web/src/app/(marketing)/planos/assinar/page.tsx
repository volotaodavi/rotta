"use client";

import { Copy } from "@rotta/icons";
import { Button, Card, FormField, Input, Typography, useToast } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { AsaasBillingType, AsaasPayment, PixCheckout } from "@rotta/api-client";

import { AsaasSecurityBadge } from "@/components/asaas-security-badge";
import {
  useCreatePreSignupAsaasCheckout,
  useCreatePreSignupPixCheckout,
  usePreSignupStatus,
} from "@/features/company/hooks/use-company";

type Metodo = "PIX" | AsaasBillingType;

const METODOS: Array<{ id: Metodo; label: string }> = [
  { id: "PIX", label: "Pix" },
  { id: "CREDIT_CARD", label: "Cartão de crédito" },
  { id: "DEBIT_CARD", label: "Cartão de débito" },
  { id: "BOLETO", label: "Boleto" },
];

/**
 * Segunda forma de assinar (Dossiê 26, pedido do usuário 31/08/2026:
 * "Assinar o plano e com uma integração criar a conta e daí ele
 * validar"). Ao lado do fluxo de sempre (`/criar-conta` -> trial de 1
 * mês -> `/assinatura` quando quiser pagar) — aqui é o inverso: paga
 * PRIMEIRO, sem conta nenhuma, e só depois completa o cadastro
 * (`/criar-conta/empresa`, pré-preenchido com os mesmos dados usados
 * aqui). O pagamento fica "guardado" (`PendingSubscription`) por 48h
 * esperando esse cadastro — se ninguém completar, é reembolsado
 * automaticamente (decisão do usuário).
 */
export default function AssinarAntesDaContaPage(): JSX.Element {
  const toast = useToast();
  const [metodo, setMetodo] = useState<Metodo>("PIX");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");

  const createPix = useCreatePreSignupPixCheckout();
  const createAsaas = useCreatePreSignupAsaasCheckout();

  const [pendingId, setPendingId] = useState<string | undefined>();
  const [pixCheckout, setPixCheckout] = useState<PixCheckout | null>(null);
  const [asaasPayment, setAsaasPayment] = useState<AsaasPayment | null>(null);
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  const { data: preSignupStatus } = usePreSignupStatus(pendingId, Boolean(pendingId));
  const pago = preSignupStatus?.status === "PAGO";

  const [cartao, setCartao] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });
  const [titular, setTitular] = useState({
    postalCode: "",
    addressNumber: "",
  });

  const nomePreenchido = nome.trim().length > 0;
  const contatoPixPreenchido = Boolean(email.trim() || cpfCnpj.trim() || telefone.trim());
  const contatoAsaasPreenchido = Boolean(email.trim() && cpfCnpj.trim());

  async function pagarComPix(): Promise<void> {
    try {
      const result = await createPix.mutateAsync({
        nome,
        email: email.trim() || undefined,
        cpfCnpj: cpfCnpj.trim() || undefined,
        telefone: telefone.trim() || undefined,
      });
      setPendingId(result.pendingId);
      setPixCheckout(result.checkout ?? null);
    } catch {
      toast.error("Não foi possível gerar o Pix. Confira os dados e tente novamente.");
    }
  }

  async function pagarComAsaas(): Promise<void> {
    try {
      const result = await createAsaas.mutateAsync({
        nome,
        email: email.trim(),
        cpfCnpj: cpfCnpj.trim(),
        telefone: telefone.trim() || undefined,
        billingType: metodo as AsaasBillingType,
        ...(metodo !== "BOLETO"
          ? {
              cartao,
              titular: {
                name: nome,
                email: email.trim(),
                cpfCnpj: cpfCnpj.trim(),
                postalCode: titular.postalCode,
                addressNumber: titular.addressNumber,
                phone: telefone.trim() || undefined,
              },
            }
          : {}),
      });
      setPendingId(result.pendingId);
      setAsaasPayment(result.payment ?? null);
    } catch {
      toast.error("Não foi possível processar o pagamento. Confira os dados e tente novamente.");
    }
  }

  async function copiarCodigoPix(): Promise<void> {
    if (!pixCheckout) return;
    await navigator.clipboard.writeText(pixCheckout.brCode);
    setCodigoCopiado(true);
    setTimeout(() => setCodigoCopiado(false), 2000);
  }

  async function copiarLinhaDigitavel(): Promise<void> {
    if (!asaasPayment?.identificationField) return;
    await navigator.clipboard.writeText(asaasPayment.identificationField);
    setCodigoCopiado(true);
    setTimeout(() => setCodigoCopiado(false), 2000);
  }

  // Pagamento confirmado (webhook já marcou PAGO) — a partir daqui, o
  // próximo passo é completar o cadastro, não mais nada relacionado a
  // pagamento. Query string leva os mesmos dados pra pré-preencher
  // `/criar-conta/empresa` (ver `initialState` lá).
  if (pago) {
    const params = new URLSearchParams({
      ...(nome ? { nome } : {}),
      ...(email ? { email } : {}),
      ...(cpfCnpj ? { cpfCnpj } : {}),
      ...(telefone ? { telefone } : {}),
    });
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-20 text-center">
        <Typography variant="title" color="success">
          Pagamento confirmado!
        </Typography>
        <Typography variant="body" color="muted">
          Falta só um passo: complete o cadastro da sua empresa. Vamos reconhecer este pagamento
          automaticamente pelos dados que você usou aqui.
        </Typography>
        <Link
          href={`/criar-conta/empresa?${params.toString()}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Completar cadastro
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
      <div>
        <Typography variant="title">Assinar antes de criar a conta</Typography>
        <Typography variant="body" color="muted">
          R$ 39,90/mês. Pague agora e complete o cadastro da sua empresa em seguida — sem precisar
          esperar o trial ou entrar na plataforma antes.
        </Typography>
      </div>

      {!pendingId && (
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <FormField label="Seu nome (ou nome da empresa)" isRequired>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="João da Silva"
              />
            </FormField>
            <FormField
              label="E-mail"
              helperText={
                metodo === "PIX"
                  ? "Opcional — pelo menos um destes 3 campos é obrigatório."
                  : undefined
              }
              isRequired={metodo !== "PIX"}
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@example.com"
              />
            </FormField>
            <FormField
              label="CPF ou CNPJ"
              helperText={
                metodo === "PIX"
                  ? "Opcional — pelo menos um destes 3 campos é obrigatório."
                  : undefined
              }
              isRequired={metodo !== "PIX"}
            >
              <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
            </FormField>
            <FormField
              label="Telefone"
              helperText={
                metodo === "PIX"
                  ? "Opcional — pelo menos um destes 3 campos é obrigatório."
                  : "Opcional."
              }
            >
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </FormField>
          </Card.Body>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {METODOS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={Boolean(pendingId)}
            onClick={() => setMetodo(item.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              metodo === item.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-text hover:border-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {metodo !== "PIX" ? <AsaasSecurityBadge /> : null}

      {metodo === "PIX" && (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3">
            {pixCheckout ? (
              <>
                <Typography variant="body" color="muted" className="text-center">
                  Escaneie o QR Code ou copie o código abaixo. Assim que o pagamento cair, esta
                  página avança sozinha.
                </Typography>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem base64 dinâmica */}
                <img
                  src={
                    pixCheckout.brCodeBase64.startsWith("data:")
                      ? pixCheckout.brCodeBase64
                      : `data:image/png;base64,${pixCheckout.brCodeBase64}`
                  }
                  alt="QR Code Pix"
                  className="h-56 w-56"
                />
                <Button variant="ghost" onClick={() => void copiarCodigoPix()}>
                  <Copy className="h-4 w-4" />
                  {codigoCopiado ? "Copiado!" : "Copiar código copia-e-cola"}
                </Button>
              </>
            ) : (
              <Button
                isLoading={createPix.isPending}
                disabled={!nomePreenchido || !contatoPixPreenchido}
                onClick={() => void pagarComPix()}
                className="self-start"
              >
                Gerar Pix
              </Button>
            )}
          </Card.Body>
        </Card>
      )}

      {(metodo === "CREDIT_CARD" || metodo === "DEBIT_CARD") &&
        (asaasPayment ? (
          <Card>
            <Card.Body>
              <Typography variant="body" color="muted" className="py-8 text-center">
                {asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED"
                  ? "Pagamento confirmado!"
                  : "Processando o pagamento do cartão…"}
              </Typography>
            </Card.Body>
          </Card>
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
                isLoading={createAsaas.isPending}
                disabled={
                  !nomePreenchido ||
                  !contatoAsaasPreenchido ||
                  !cartao.holderName ||
                  !cartao.number ||
                  !cartao.expiryMonth ||
                  !cartao.expiryYear ||
                  !cartao.ccv ||
                  !titular.postalCode ||
                  !titular.addressNumber
                }
                onClick={() => void pagarComAsaas()}
              >
                Assinar por R$ 39,90/mês
              </Button>
            </Card.Body>
          </Card>
        ))}

      {metodo === "BOLETO" &&
        (asaasPayment ? (
          <Card>
            <Card.Body className="flex flex-col gap-3">
              <Typography variant="subtitle">Boleto gerado</Typography>
              {asaasPayment.identificationField && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted p-3">
                  <Typography variant="bodySmall" className="flex-1 break-all font-mono">
                    {asaasPayment.identificationField}
                  </Typography>
                  <Button
                    variant="ghost"
                    onClick={() => void copiarLinhaDigitavel()}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                    {codigoCopiado ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              )}
              {asaasPayment.bankSlipUrl && (
                <a
                  href={asaasPayment.bankSlipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline"
                >
                  Baixar PDF do boleto
                </a>
              )}
              <Typography variant="caption" color="muted">
                Aguardando confirmação do pagamento… esta página avança sozinha assim que compensar.
              </Typography>
            </Card.Body>
          </Card>
        ) : (
          <Card>
            <Card.Body className="flex flex-col gap-3">
              <Typography variant="subtitle">Pagar com boleto</Typography>
              <Typography variant="bodySmall" color="muted">
                Confirmação em até 2 dias úteis após a compensação bancária.
              </Typography>
              <Button
                isLoading={createAsaas.isPending}
                disabled={!nomePreenchido || !contatoAsaasPreenchido}
                onClick={() => void pagarComAsaas()}
                className="self-start"
              >
                Gerar boleto
              </Button>
            </Card.Body>
          </Card>
        ))}

      <Typography variant="caption" color="muted" className="text-center">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-primary underline">
          Entre e assine
        </Link>{" "}
        direto no painel.
      </Typography>
    </div>
  );
}
