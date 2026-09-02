import { Check, Sparkles } from "@rotta/icons";
import { Card, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";

import { AsaasSecurityBadge } from "@/components/asaas-security-badge";


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
          {/* Pedido do usuário 02/09/2026: "coloque que disponibilizamos 1
              mês grátis, sem a necessidade de colocar dados para pagamento"
              — o trial de 1 mês já é real (`TRIAL_DURATION_MONTHS`), mas
              não aparecia na própria página de preço, o lugar mais óbvio
              pra essa informação. */}
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <Typography variant="bodySmall" className="font-semibold text-primary">
              1º mês grátis, sem necessidade de cartão de crédito
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
        <Card.Footer className="flex flex-col gap-2">
          <Link
            href="/criar-conta"
            className={buttonVariants({ variant: "primary", fullWidth: true })}
          >
            Começar agora
          </Link>
          {/* Segunda forma de assinar (Dossiê 26, pedido do usuário: "duas
              opções... assinar o plano e com uma integração criar a conta e
              daí ele validar") — quem já sabe que quer assinar pode pagar
              antes de existir conta nenhuma; "Começar agora" continua sendo
              o caminho padrão (trial de 1 mês, sem cartão). */}
          <Link
            href="/planos/assinar"
            className={buttonVariants({ variant: "ghost", fullWidth: true })}
          >
            Já quero assinar (pagar agora)
          </Link>
        </Card.Footer>
      </Card>

      <AsaasSecurityBadge className="w-full max-w-sm justify-center" />
    </div>
  );
}
