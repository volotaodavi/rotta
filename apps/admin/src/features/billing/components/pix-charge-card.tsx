"use client";

import { ApiError } from "@rotta/api-client";
import { QrCode } from "@rotta/icons";
import { Badge, Button, Card, Typography } from "@rotta/ui/web";
import { useState } from "react";

import {
  useAdminPixChargeStatus,
  useCreateAdminPixCharge,
} from "@/features/billing/hooks/use-billing";

const CAMPO_CLASSNAME =
  "h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

/**
 * QR Code + copia-e-cola de uma cobrança recém-criada — polling a cada
 * 4s enquanto `PENDING` (mesmo ritmo de `PixCheckoutModal`, apps/web).
 */
function PixChargeQrCode({
  chargeId,
  onNova,
}: {
  chargeId: string;
  onNova: () => void;
}): JSX.Element {
  const { data: status } = useAdminPixChargeStatus(chargeId, true);
  const [copiado, setCopiado] = useState(false);

  if (!status)
    return (
      <Typography variant="bodySmall" color="muted">
        Carregando QR Code…
      </Typography>
    );

  const imagemQrCode = status.brCodeBase64.startsWith("data:")
    ? status.brCodeBase64
    : `data:image/png;base64,${status.brCodeBase64}`;

  async function copiarCodigo(): Promise<void> {
    await navigator.clipboard.writeText(status!.brCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <Badge variant={status.status === "PAID" ? "success" : "neutral"}>
        {STATUS_LABEL[status.status] ?? status.status}
      </Badge>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem base64 dinâmica, sem otimização de asset estático aplicável */}
      <img
        src={imagemQrCode}
        alt="QR Code Pix da cobrança"
        className="h-48 w-48 rounded-md border border-border"
      />
      <Typography variant="title">{centsToBRL(status.amount)}</Typography>
      <Button variant="secondary" size="sm" onClick={() => void copiarCodigo()} fullWidth>
        {copiado ? "Código copiado!" : "Copiar código Pix"}
      </Button>
      <Button variant="ghost" size="sm" onClick={onNova} fullWidth>
        Gerar outra cobrança
      </Button>
    </div>
  );
}

/**
 * "Posso também pedir o recebimento de transferências através da
 * plataforma? Incluindo o QR Code pix?" (pedido do usuário 03/09/2026)
 * — cobrança Pix avulsa, gerada pelo Admin, sem vínculo com mensalidade
 * de nenhuma empresa. `AdminRottaPapel.FINANCEIRO` também aciona (é um
 * recebível, nunca dinheiro saindo — diferente de `TransferForm`).
 */
export function PixChargeCard(): JSX.Element {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nomePagador, setNomePagador] = useState("");
  const [cpfCnpjPagador, setCpfCnpjPagador] = useState("");
  const [emailPagador, setEmailPagador] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);

  const createCharge = useCreateAdminPixCharge();

  const valorCentavos = Math.round(Number(valor.replace(",", ".")) * 100);
  const formularioValido =
    Number.isFinite(valorCentavos) &&
    valorCentavos > 0 &&
    nomePagador.trim().length > 0 &&
    cpfCnpjPagador.trim().length > 0;

  function handleGerar(): void {
    if (!formularioValido) {
      setError("Informe um valor maior que zero, o nome e o CPF/CNPJ de quem vai pagar.");
      return;
    }
    setError(null);
    createCharge.mutate(
      {
        valorCentavos,
        descricao: descricao || undefined,
        nomePagador: nomePagador.trim(),
        cpfCnpjPagador: cpfCnpjPagador.trim(),
        emailPagador: emailPagador.trim() || undefined,
      },
      {
        onSuccess: (checkout) => setChargeId(checkout.id),
        onError: (err) =>
          setError(errorMessage(err, "Não foi possível gerar a cobrança. Tente novamente.")),
      },
    );
  }

  function handleNova(): void {
    setChargeId(null);
    setValor("");
    setDescricao("");
    setNomePagador("");
    setCpfCnpjPagador("");
    setEmailPagador("");
  }

  return (
    <Card>
      <Card.Header
        title="Gerar cobrança Pix"
        action={<QrCode className="h-4 w-4 text-text-muted" />}
      />
      <Card.Body>
        {chargeId ? (
          <PixChargeQrCode chargeId={chargeId} onNova={handleNova} />
        ) : (
          <div className="flex flex-col gap-3">
            <Typography variant="caption" color="muted">
              Cobrança avulsa, não vinculada à mensalidade de nenhuma empresa — pra receber qualquer
              valor por Pix direto na conta Asaas da Rotta.
            </Typography>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text" htmlFor="charge-valor">
                  Valor (R$)
                </label>
                <input
                  id="charge-valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(event) => setValor(event.target.value.replace(/[^\d,.]/g, ""))}
                  placeholder="0,00"
                  className={CAMPO_CLASSNAME}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text" htmlFor="charge-nome">
                  Nome do pagador
                </label>
                <input
                  id="charge-nome"
                  value={nomePagador}
                  onChange={(event) => setNomePagador(event.target.value)}
                  placeholder="Nome completo"
                  className={CAMPO_CLASSNAME}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text" htmlFor="charge-cpf">
                  CPF/CNPJ do pagador
                </label>
                <input
                  id="charge-cpf"
                  value={cpfCnpjPagador}
                  onChange={(event) => setCpfCnpjPagador(event.target.value)}
                  placeholder="Só números"
                  className={CAMPO_CLASSNAME}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text" htmlFor="charge-email">
                  E-mail (opcional)
                </label>
                <input
                  id="charge-email"
                  type="email"
                  value={emailPagador}
                  onChange={(event) => setEmailPagador(event.target.value)}
                  placeholder="pagador@exemplo.com"
                  className={CAMPO_CLASSNAME}
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
                <label className="text-sm font-medium text-text" htmlFor="charge-descricao">
                  Descrição (opcional)
                </label>
                <input
                  id="charge-descricao"
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Motivo da cobrança"
                  className={CAMPO_CLASSNAME}
                />
              </div>
            </div>

            {error && (
              <Typography variant="bodySmall" color="danger">
                {error}
              </Typography>
            )}

            <div>
              <Button
                variant="primary"
                iconLeft={<QrCode className="h-4 w-4" />}
                isLoading={createCharge.isPending}
                onClick={handleGerar}
              >
                Gerar cobrança
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
