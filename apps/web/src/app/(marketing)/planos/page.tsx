import { Check } from "@rotta/icons";
import { Card, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos e preços",
  description:
    "Plano Starter da Rotta por R$ 39,90/mês: cadastro de motoristas e veículos, rastreamento em tempo real, notificações para responsáveis e painel de gestão completo. Sem taxa para responsável, motorista contratado ou monitor.",
  alternates: { canonical: "/planos" },
  keywords: [
    "preço sistema transporte escolar",
    "plano transportadora escolar",
    "quanto custa app de transporte escolar",
  ],
};

/** Planos (briefing "PLANO") — Starter é o único hoje; estrutura (Dossiê 16 `Plan`) já suporta novos planos sem migration de schema. */
export default function PlanosPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 px-6 py-20">
      <div className="flex flex-col items-center gap-2 text-center">
        <Typography variant="headline" as="h1">
          Um plano simples para começar
        </Typography>
        <Typography variant="body" color="muted">
          Mais planos chegam conforme sua operação cresce.
        </Typography>
      </div>

      <Card className="w-full max-w-sm">
        <Card.Header title="Starter" />
        <Card.Body className="flex flex-col gap-4">
          <div>
            <Typography variant="display" as="span">
              R$ 39,90
            </Typography>
            <Typography variant="bodySmall" color="muted">
              {" "}
              /mês
            </Typography>
          </div>
          <ul className="flex flex-col gap-2.5">
            {[
              "Cadastro de motoristas e veículos",
              "Rastreamento em tempo real",
              "Notificações para responsáveis",
              "Painel de gestão completo",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <Typography variant="bodySmall">{item}</Typography>
              </li>
            ))}
          </ul>
        </Card.Body>
        <Card.Footer>
          <Link
            href="/criar-conta"
            className={buttonVariants({ variant: "primary", fullWidth: true })}
          >
            Começar agora
          </Link>
        </Card.Footer>
      </Card>
    </div>
  );
}
