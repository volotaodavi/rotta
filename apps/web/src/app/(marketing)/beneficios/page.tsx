import { Building2, Car, School, Users } from "@rotta/icons";
import { Card, Typography } from "@rotta/ui/web";

import type { Metadata } from "next";
import type { ComponentType } from "react";

export const metadata: Metadata = {
  title: "Benefícios",
  description:
    "O que a Rotta resolve para cada lado da rota: gestão centralizada para transportadoras, app simples para motoristas, acompanhamento em tempo real para famílias e visibilidade do transporte para escolas.",
  alternates: { canonical: "/beneficios" },
};

const BENEFITS: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    title: "Para empresas",
    description: "Gestão centralizada de motoristas, veículos e rotas.",
    icon: Building2,
  },
  {
    title: "Para motoristas",
    description: "App simples para conduzir a rota e registrar embarques.",
    icon: Car,
  },
  {
    title: "Para famílias",
    description: "Acompanhamento em tempo real do transporte do seu filho.",
    icon: Users,
  },
  {
    title: "Para escolas",
    description: "Visibilidade sobre o transporte de todos os alunos.",
    icon: School,
  },
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
            <Card.Body className="flex flex-col gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <benefit.icon className="h-5 w-5" />
              </span>
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
