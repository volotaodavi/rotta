import { Button, Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

const BENEFITS = [
  {
    title: "Rastreamento em tempo real",
    description: "Localização do transporte escolar ao vivo, do embarque ao desembarque.",
  },
  {
    title: "Comunicação automática",
    description: "Responsáveis avisados a cada etapa da rota, sem ligações nem grupos de WhatsApp.",
  },
  {
    title: "Gestão simples",
    description: "Motoristas, veículos, rotas e alunos em um único painel.",
  },
];

/**
 * Landing Page (Dossiê 11, Secao 1) — minimalista, inspirada em
 * Uber/Stripe/Notion/Linear/Apple/Google (briefing): muito espaço em
 * branco, poucos textos, foco em conversão ("Começar agora").
 */
export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pb-24 pt-16 text-center sm:pt-28">
        <Typography variant="display" as="h1" className="max-w-2xl">
          Transporte escolar sob controle.
        </Typography>
        <Typography variant="body" color="muted" className="max-w-lg">
          A Rotta conecta empresas, motoristas e famílias em um único lugar — do embarque à entrega,
          em tempo real.
        </Typography>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link href="/criar-conta">
            <Button variant="primary" size="lg">
              Começar agora
            </Button>
          </Link>
          <Link href="/planos">
            <Button variant="secondary" size="lg">
              Ver planos
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
        {BENEFITS.map((benefit) => (
          <Card key={benefit.title}>
            <Card.Body className="flex flex-col gap-2">
              <Typography variant="subtitle">{benefit.title}</Typography>
              <Typography variant="bodySmall" color="muted">
                {benefit.description}
              </Typography>
            </Card.Body>
          </Card>
        ))}
      </section>

      <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 pb-28 text-center">
        <Typography variant="headline" as="h2">
          Pronto para começar?
        </Typography>
        <Link href="/criar-conta">
          <Button variant="primary" size="lg">
            Criar conta gratuita
          </Button>
        </Link>
      </section>
    </div>
  );
}
