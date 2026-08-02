import { Card, Typography } from "@rotta/ui/web";

const BENEFITS = [
  { title: "Para empresas", description: "Gestão centralizada de motoristas, veículos e rotas." },
  {
    title: "Para motoristas",
    description: "App simples para conduzir a rota e registrar embarques.",
  },
  {
    title: "Para famílias",
    description: "Acompanhamento em tempo real do transporte do seu filho.",
  },
  { title: "Para escolas", description: "Visibilidade sobre o transporte de todos os alunos." },
];

/** Benefícios (briefing "SITE RESPONSIVO") — por persona, seguindo o mesmo princípio de conteúdo enxuto da Landing Page. */
export default function BeneficiosPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-20">
      <Typography variant="headline" as="h1" className="text-center">
        Benefícios para todos os lados da rota
      </Typography>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
