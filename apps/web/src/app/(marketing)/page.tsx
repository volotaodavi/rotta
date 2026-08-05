import {
  ArrowRight,
  Bell,
  Check,
  Headset,
  LayoutGrid,
  Link2,
  MapPin,
  Route as RouteIcon,
  ShieldCheck,
  UserPlus,
} from "@rotta/icons";
import { Badge, Button, Card, Typography } from "@rotta/ui/web";
import Image from "next/image";
import Link from "next/link";

import type { Route } from "next";
import type { ComponentType } from "react";

import { RouteDemoSection } from "@/components/route-demo-section";

const TRUST_CHIPS: { label: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: "Rastreamento em tempo real", icon: MapPin },
  { label: "Notificações automáticas", icon: Bell },
  { label: "Documentos verificados por IA", icon: ShieldCheck },
];

interface AudienceCard {
  titulo: string;
  descricao: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: Route;
}

const AUDIENCIAS: AudienceCard[] = [
  {
    titulo: "Sou responsável",
    descricao: "Encontre um transporte escolar de confiança e acompanhe cada trajeto ao vivo.",
    bullets: [
      "Localização do transporte em tempo real",
      "Notificação a cada embarque e desembarque",
      "Histórico completo de viagens",
    ],
    ctaLabel: "Encontrar transporte",
    ctaHref: "/criar-conta/pessoal",
  },
  {
    titulo: "Sou transportadora",
    descricao: "Centralize motoristas, veículos, rotas e alunos em um único painel.",
    bullets: [
      "Gestão completa da frota e da equipe",
      "Rotas otimizadas e vínculo de alunos",
      "Documentos e conformidade sem planilhas",
    ],
    ctaLabel: "Cadastrar minha empresa",
    ctaHref: "/criar-conta/empresa",
  },
  {
    titulo: "Sou motorista ou monitor",
    descricao: "Um app simples para conduzir a rota, registrar embarques e manter tudo em dia.",
    bullets: [
      "Rota do dia sempre à mão",
      "Registro de embarque/desembarque em 1 toque",
      "Checklist do veículo antes de cada viagem",
    ],
    ctaLabel: "Quero dirigir com a Rotta",
    ctaHref: "/criar-conta/profissional",
  },
];

const COMO_FUNCIONA: {
  numero: string;
  titulo: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    numero: "01",
    titulo: "Cadastre-se",
    descricao: "Crie sua conta em minutos — sem burocracia, sem contrato de fidelidade.",
    icon: UserPlus,
  },
  {
    numero: "02",
    titulo: "Vincule sua rota",
    descricao: "Conecte motoristas, veículos, escolas e alunos em poucos cliques.",
    icon: Link2,
  },
  {
    numero: "03",
    titulo: "Acompanhe em tempo real",
    descricao: "Veja o transporte se mover no mapa, do embarque até a entrega.",
    icon: MapPin,
  },
  {
    numero: "04",
    titulo: "Fique tranquilo",
    descricao: "Notificações automáticas a cada etapa — chega de grupo de WhatsApp.",
    icon: ShieldCheck,
  },
];

const BENEFICIOS: {
  titulo: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    titulo: "Rastreamento em tempo real",
    descricao: "Localização do transporte escolar ao vivo, do embarque ao desembarque.",
    icon: MapPin,
  },
  {
    titulo: "Comunicação automática",
    descricao: "Responsáveis avisados a cada etapa da rota, sem ligações nem grupos de WhatsApp.",
    icon: Bell,
  },
  {
    titulo: "Gestão simples",
    descricao: "Motoristas, veículos, rotas e alunos em um único painel.",
    icon: LayoutGrid,
  },
  {
    titulo: "Documentos verificados por IA",
    descricao: "CNH, veículo e antecedentes analisados automaticamente antes de qualquer viagem.",
    icon: ShieldCheck,
  },
  {
    titulo: "Rotas inteligentes",
    descricao: "Sequência de embarque otimizada e recálculo automático quando um aluno falta.",
    icon: RouteIcon,
  },
  {
    titulo: "Suporte dedicado",
    descricao: "Time de suporte acompanhando empresas, motoristas e famílias todos os dias.",
    icon: Headset,
  },
];

/** Painel visual da hero — o logotipo real da Rotta (`public/brand`) em destaque, com o mesmo motivo de rota do restante da página ao redor. */
function HeroVisual(): JSX.Element {
  return (
    <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-muted via-transparent to-transparent" />
      <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          d="M40 260 C 40 180, 120 200, 150 150 S 260 60, 280 40"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 10"
          fill="none"
        />
        <circle cx="40" cy="260" r="8" className="fill-primary" />
        <circle cx="280" cy="40" r="8" className="fill-secondary" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <Image
          src="/brand/rotta-mark-512.png"
          alt="Rotta"
          width={220}
          height={220}
          priority
          className="relative drop-shadow-2xl"
        />
      </div>
      <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-border bg-card/90 p-4 backdrop-blur">
        <Typography variant="caption" color="muted">
          Rota em andamento
        </Typography>
        <Typography variant="subtitle" className="mt-1">
          Chegada em 6 min
        </Typography>
      </div>
    </div>
  );
}

/**
 * Landing Page (Dossiê 11, Secao 1) — estrutura inspirada na
 * organização das landing pages da Uber e da 99 (hero com CTA duplo,
 * seção por público, "como funciona" numerado, grade de benefícios,
 * chamada final e rodapé em colunas), mantendo a identidade visual
 * própria da Rotta (azul/preto/branco/cinza, Dossiê 24) — nenhuma cor
 * ou elemento de marca das referências foi reaproveitado.
 */
export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col">
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-6 text-left">
          <Badge variant="info">Transporte escolar inteligente</Badge>
          <Typography variant="display" as="h1">
            O caminho até a escola, sempre à vista.
          </Typography>
          <Typography variant="body" color="muted" className="max-w-lg">
            A Rotta conecta transportadoras, motoristas e famílias em um só lugar — rastreamento em
            tempo real, do embarque à entrega.
          </Typography>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link href="/criar-conta">
              <Button variant="primary" size="lg">
                Criar conta grátis
              </Button>
            </Link>
            <Link href="/planos">
              <Button variant="secondary" size="lg">
                Ver planos
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {TRUST_CHIPS.map((chip) => (
              <Badge key={chip.label} variant="neutral">
                <span className="flex items-center gap-1.5">
                  <chip.icon className="h-3.5 w-3.5" />
                  {chip.label}
                </span>
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <HeroVisual />
        </div>
      </section>

      <RouteDemoSection />

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <Typography variant="headline" as="h2" className="mb-10 text-center">
          Para qual lado da rota você está?
        </Typography>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {AUDIENCIAS.map((audiencia) => (
            <Card key={audiencia.titulo} className="flex flex-col">
              <Card.Body className="flex flex-1 flex-col gap-4">
                <Typography variant="subtitle">{audiencia.titulo}</Typography>
                <Typography variant="bodySmall" color="muted">
                  {audiencia.descricao}
                </Typography>
                <ul className="flex flex-1 flex-col gap-2">
                  {audiencia.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <Typography variant="bodySmall" color="muted">
                        {bullet}
                      </Typography>
                    </li>
                  ))}
                </ul>
                <Link href={audiencia.ctaHref} className="pt-2">
                  <Button variant="secondary" fullWidth>
                    {audiencia.ctaLabel}
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          ))}
        </div>
      </section>

      <section className="w-full bg-surface px-6 py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Typography variant="headline" as="h2" className="mb-12 text-center">
            Como funciona
          </Typography>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {COMO_FUNCIONA.map((passo) => (
              <div key={passo.numero} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <passo.icon className="h-5 w-5" />
                  </span>
                  <Typography variant="headline" color="primary">
                    {passo.numero}
                  </Typography>
                </div>
                <Typography variant="subtitle">{passo.titulo}</Typography>
                <Typography variant="bodySmall" color="muted">
                  {passo.descricao}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <Typography variant="headline" as="h2" className="mb-10 text-center">
          Tudo que uma rota escolar precisa
        </Typography>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((beneficio) => (
            <Card key={beneficio.titulo}>
              <Card.Body className="flex flex-col gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <beneficio.icon className="h-5 w-5" />
                </span>
                <Typography variant="subtitle">{beneficio.titulo}</Typography>
                <Typography variant="bodySmall" color="muted">
                  {beneficio.descricao}
                </Typography>
              </Card.Body>
            </Card>
          ))}
        </div>
      </section>

      <section className="w-full border-y border-border bg-surface px-6 py-20">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <Typography variant="headline" as="h2">
            Pronto para colocar sua rota no piloto automático?
          </Typography>
          <Typography variant="body" color="muted">
            Leva menos de 5 minutos para criar sua conta e começar a acompanhar o transporte.
          </Typography>
          <Link href="/criar-conta">
            <Button variant="primary" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>
              Criar conta gratuita
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
