"use client";

import { Card, Typography, Button } from "@rotta/ui/web";
import { useState } from "react";

import type { PixCheckout } from "@rotta/api-client";

import { PixCheckoutModal } from "@/features/billing/components/pix-checkout-modal";
import { useCreatePixCheckout } from "@/features/company/hooks/use-company";


/**
 * Checkout próprio da Rotta (Dossiê 26, faturamento) — página que
 * `TrialLockModal`/`BillingBlockScreen` linkam pra "Assinar agora".
 * Único método já real hoje é o Pix embutido (`PixCheckoutModal`,
 * AbacatePay) — cartão de crédito/débito e boleto (Asaas) chegam numa
 * próxima entrega deste mesmo Dossiê; por ora mostrados como "em
 * breve" (stub honesto, nunca finge um botão que não faz nada).
 */
export default function AssinaturaPage(): JSX.Element {
  const createPixCheckout = useCreatePixCheckout();
  const [pixCheckout, setPixCheckout] = useState<PixCheckout | null>(null);

  async function pagarComPix(): Promise<void> {
    const result = await createPixCheckout.mutateAsync();
    setPixCheckout(result);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Typography variant="title">Assinar o plano Starter</Typography>
        <Typography variant="body" color="muted">
          R$ 39,90/mês, sem adicional. Escolha como prefere pagar.
        </Typography>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-3">
          <Typography variant="subtitle">Pix</Typography>
          <Typography variant="bodySmall" color="muted">
            QR Code + copia-e-cola, confirmação automática — sem sair desta tela.
          </Typography>
          <Button
            isLoading={createPixCheckout.isPending}
            onClick={() => void pagarComPix()}
            className="self-start"
          >
            Pagar com Pix
          </Button>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="flex flex-col gap-2 opacity-60">
          <Typography variant="subtitle">Cartão de crédito, débito ou boleto</Typography>
          <Typography variant="bodySmall" color="muted">
            Em breve — chegando nesta mesma tela, sem precisar sair da Rotta.
          </Typography>
        </Card.Body>
      </Card>

      {pixCheckout && (
        <PixCheckoutModal checkout={pixCheckout} onClose={() => setPixCheckout(null)} />
      )}
    </div>
  );
}
