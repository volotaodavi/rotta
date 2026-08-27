"use client";

import { Lock } from "@rotta/icons";
import { Card, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";

/**
 * Bloqueio total do Painel Web quando `user.billingBlocked` (Dossiê 26 —
 * trial vencido +1 dia de graça, inadimplente, suspenso ou cancelado).
 * Mesmo molde de `IdentityVerificationBlockScreen`: `(dashboard)/layout.tsx`
 * renderiza este componente NO LUGAR de `children` pra qualquer rota
 * protegida — exceto `/chamados` e `/assinatura`, que continuam
 * acessíveis mesmo bloqueado (pedido do usuário: "exceto no suporte,
 * que aí eles podem acionar o suporte" + precisa conseguir pagar).
 */
export function BillingBlockScreen({ reason }: { reason: string | null }): JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Body className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <Lock size={28} />
          </span>
          <Typography variant="title">Assinatura necessária</Typography>
          <Typography variant="body" color="muted">
            {reason ??
              "Seu período de teste grátis acabou. Assine o plano Starter (R$ 39,90/mês) para continuar usando a Rotta."}
          </Typography>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/assinatura" className={buttonVariants({ variant: "primary" })}>
              Assinar agora
            </Link>
            <Link href="/chamados" className={buttonVariants({ variant: "secondary" })}>
              Falar com o suporte
            </Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
