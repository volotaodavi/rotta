"use client";

import { X } from "@rotta/icons";
import { Button, Typography } from "@rotta/ui/web";
import { useEffect, useState } from "react";

import type { PixCheckout } from "@rotta/api-client";

import { usePixCheckoutStatus } from "@/features/company/hooks/use-company";

/**
 * Checkout Pix embutido (briefing "pagar sem precisar ir em outro
 * lugar") — QR Code + código copia-e-cola vêm prontos na resposta da
 * API (`createPixQrCode`), renderizados direto nesta tela. Extraído de
 * `(dashboard)/empresa/page.tsx` (Frente B, faturamento) pra também
 * ser reusado em `(dashboard)/assinatura/page.tsx` — mesmo componente,
 * um único lugar de manutenção.
 *
 * Fecha sozinho assim que `usePixCheckoutStatus` (polling a cada 4s)
 * deixa de reportar `PENDING` — o webhook `billing.paid` continua
 * sendo quem de fato ativa a empresa (`BillingService.applyPixPayment`);
 * este polling só decide a experiência do modal.
 */
export function PixCheckoutModal({
  checkout,
  onClose,
}: {
  checkout: PixCheckout;
  onClose: () => void;
}): JSX.Element {
  const { data: status } = usePixCheckoutStatus(checkout.id, true);
  const [copiado, setCopiado] = useState(false);
  const atual = status ?? checkout;

  useEffect(() => {
    if (atual.status !== "PENDING") {
      const timeout = setTimeout(onClose, 2500);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [atual.status, onClose]);

  async function copiarCodigo(): Promise<void> {
    await navigator.clipboard.writeText(atual.brCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const imagemQrCode = atual.brCodeBase64.startsWith("data:")
    ? atual.brCodeBase64
    : `data:image/png;base64,${atual.brCodeBase64}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
        <div className="flex w-full items-center justify-between">
          <Typography variant="subtitle">Pagar com Pix</Typography>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {atual.status === "PAID" ? (
          <Typography variant="body" color="success" className="py-8 text-center">
            Pagamento confirmado! Sua assinatura já está ativa.
          </Typography>
        ) : atual.status !== "PENDING" ? (
          <Typography variant="body" color="danger" className="py-8 text-center">
            Este Pix não está mais disponível ({atual.status.toLowerCase()}). Feche e tente
            novamente.
          </Typography>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem base64 dinâmica, sem otimização de asset estático aplicável */}
            <img
              src={imagemQrCode}
              alt="QR Code Pix"
              className="h-56 w-56 rounded-md border border-neutral-200 dark:border-neutral-700"
            />
            <Typography variant="bodySmall" color="muted" className="text-center">
              Escaneie com o app do seu banco ou copie o código abaixo.
            </Typography>
            <Button variant="secondary" onClick={() => void copiarCodigo()} className="w-full">
              {copiado ? "Código copiado!" : "Copiar código Pix"}
            </Button>
            <Typography variant="caption" color="muted">
              Aguardando confirmação do pagamento…
            </Typography>
          </>
        )}
      </div>
    </div>
  );
}
