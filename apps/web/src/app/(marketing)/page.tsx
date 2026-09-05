import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Car,
  CheckCircle2,
  Compass,
  History,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Route as RouteIcon,
  ShieldCheck,
  Users,
} from "@rotta/icons";
import { Typography } from "@rotta/ui/web";
import Image from "next/image";
import Link from "next/link";

import { ROTTA_APP_URL } from "./layout";

import type { Metadata, Route } from "next";
import type { ComponentType } from "react";

import { HeroMapDemoLazy } from "@/components/hero-map-demo-lazy";
import {
  MotoristaMockup,
  ResponsavelMockup,
  TransportadoraMockup,
} from "@/components/landing-product-mockups";
import { pillGhostLg, pillOnAccentLg, pillPrimaryLg } from "@/components/pill-button-classes";
import { Reveal } from "@/components/reveal-on-scroll";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

/** Canonical/keywords reais do produto — título/descrição/OG herdam do root layout, já otimizados. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  keywords: [
    "transporte escolar",
    "rastreamento de transporte escolar em tempo real",
    "app para acompanhar van escolar",
    "gestão de transportadora escolar",
    "sistema para motorista escolar",
  ],
};

/** Faixa de prova de valor logo abaixo da hero — 3 capacidades reais, sem número inventado. */
const FAIXA_VALOR: { titulo: string; icon: ComponentType<{ className?: string }> }[] = [
  { titulo: "Acompanhamento em tempo real", icon: MapPin },
  { titulo: "Rotas organizadas", icon: RouteIcon },
  { titulo: "Mais tranquilidade para responsáveis", icon: ShieldCheck },
];

interface PublicoBloco {
  id: string;
  titulo: string;
  ideia: string;
  recursos: string[];
  foto: { src: string; alt: string };
  ctaHref: Route;
}

/**
 * Os três públicos da Rotta (pedido do usuário 02/09/2026) — Motorista
 * e Monitor combinados num único bloco ("Para motoristas e monitores"),
 * diferente da grade de 4 audiências que a página tinha antes
 * (`audience-data.ts`, mantido no repo mas não usado por esta versão
 * da página). Fotos reais já existentes em `public/marketing/`.
 */
const PUBLICOS: PublicoBloco[] = [
  {
    id: "para-responsaveis",
    titulo: "Para responsáveis",
    ideia: "Acompanhe o transporte do seu filho em tempo real.",
    recursos: [
      "Localização da viagem",
      "Notificações de embarque e desembarque",
      "Histórico de viagens",
    ],
    foto: {
      src: "/marketing/audiencia-responsavel.jpg",
      alt: "Responsável acompanhando o transporte escolar em tempo real pelo celular",
    },
    ctaHref: "/criar-conta/pessoal",
  },
  {
    id: "para-transportadores",
    titulo: "Para transportadores",
    ideia: "Tenha sua operação organizada em um só lugar.",
    recursos: [
      "Gestão de rotas e viagens",
      "Motoristas, monitores e alunos",
      "Frota e documentos em dia",
    ],
    foto: {
      src: "/marketing/audiencia-empresas.jpg",
      alt: "Gestor de transportadora acompanhando a frota pelo painel da Rotta",
    },
    ctaHref: "/criar-conta/empresa",
  },
  {
    id: "para-motoristas",
    titulo: "Para motoristas e monitores",
    ideia: "Mais clareza durante cada viagem.",
    recursos: [
      "Rota e mapa sempre à mão",
      "Lista de alunos e ocorrências",
      "Acompanhamento da viagem",
    ],
    foto: {
      src: "/marketing/audiencia-motorista.jpg",
      alt: "Motorista de transporte escolar visualizando a próxima viagem pelo aplicativo da Rotta",
    },
    ctaHref: "/criar-conta/motorista",
  },
];

/** "Tudo começa com uma rota." — o fluxo real entre os 4 papéis, nesta ordem. */
const FLUXO: { titulo: string; descricao: string; icon: ComponentType<{ className?: string }> }[] =
  [
    {
      titulo: "Responsável acompanha",
      descricao: "Vê o transporte no mapa e recebe notificação a cada embarque e desembarque.",
      icon: MapPin,
    },
    {
      titulo: "Motorista realiza a viagem",
      descricao: "Segue a rota do dia com o mapa e a lista de alunos sempre à mão.",
      icon: Car,
    },
    {
      titulo: "Monitor acompanha os alunos",
      descricao: "Confirma cada embarque e desembarque e registra ocorrências na hora.",
      icon: Users,
    },
    {
      titulo: "Transportador gerencia a operação",
      descricao: "Vê rotas, viagens, motoristas e monitores organizados num só painel.",
      icon: LayoutGrid,
    },
  ];

/** "Feita para a rotina real do transporte escolar." — só capacidades já implementadas. */
const ROTINA_REAL: { titulo: string; icon: ComponentType<{ className?: string }> }[] = [
  { titulo: "Rotas organizadas", icon: RouteIcon },
  { titulo: "Localização em tempo real", icon: MapPin },
  { titulo: "Controle de embarque e desembarque", icon: CheckCircle2 },
  { titulo: "Notificações", icon: Bell },
  { titulo: "Gestão de motoristas e monitores", icon: Users },
  { titulo: "Registro de ocorrências", icon: AlertTriangle },
  { titulo: "Histórico de viagens", icon: History },
];

/**
 * Landing Page — reconstrução pedida pelo usuário 02/09/2026 ("Crie/
 * reconstrua a landing page oficial da ROTTA... seguindo rigorosamente
 * a identidade visual da marca e a direção de arte descrita"). Estrutura
 * inteiramente nova em relação à versão anterior (histórico de decisões
 * Uber/inDrive/Cittamobi arquivado no git — esta versão segue o
 * briefing enviado pelo usuário, seção por seção, na ordem pedida).
 *
 * Sem foto de van escolar na hero: não existe esse asset no projeto
 * (Dossiê 24 já registrava "a Rotta não tem fotografia real de van/
 * motorista ainda") e a instrução explícita foi não usar banco de
 * imagens genérico. Em vez disso, o mapa real da Rotta (`HeroMapDemo`,
 * MapLibre + OpenStreetMap, rota azul + veículo em movimento + cartão
 * flutuante) ocupa sozinho o lado direito da hero — cumpre o pedido de
 * "interface de mapa da Rotta... parte do produto, não decoração" sem
 * inventar uma fotografia que não existe.
 *
 * Cores: nenhuma variável nova — os tokens que o pedido chama de
 * `--rotta-blue`/`--rotta-white`/etc. já existem em `packages/theme`
 * como `--color-primary`/`--color-background`/`--color-text`/
 * `--color-text-muted`/`--color-border` (extraídos, nunca reinventados
 * — ver `(marketing)/layout.tsx`, que força o tema claro nesta seção
 * do site). "Azul profundo institucional" = `.ink-scope` (cabeçalho
 * antes de rolar/rodapé); "azul vibrante" = `--color-primary`.
 *
 * Revisão 02/09/2026 (pedido do usuário: "tire os travessões... retire
 * mensagens que repitam sempre a mesma coisa"): travessão (—) removido
 * de todo texto visível da página (só sobrevive dentro de comentários
 * de código, que ninguém vê renderizado). A seção "Conecta. Protege.
 * Tranquiliza." foi removida inteira: repetia quase palavra por palavra
 * a mesma mensagem da hero e da seção "Sobre" ("unifica responsável,
 * motorista, monitor e transportador numa plataforma só, trajeto
 * acompanhado do início ao fim") e reciclava o mesmo motivo visual de
 * linha/rota em SVG da seção logo acima — duas vezes a mesma ideia, em
 * texto e em desenho. O título da seção de mockups também repetia a
 * fórmula "Feita para..." da seção seguinte; virou "A mesma viagem, sob
 * três pontos de vista.".
 */
export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* ===== Hero ===== */}
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-24 pt-14 sm:pt-20 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start gap-6 text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Transporte escolar inteligente
            </span>
            <h1 className="text-[42px] font-bold leading-[1.03] tracking-[-0.02em] text-text sm:text-[56px] lg:text-[64px]">
              Uma nova rota para o transporte escolar.
            </h1>
            <Typography variant="body" color="muted" className="max-w-lg">
              A Rotta conecta responsáveis, motoristas, monitores e transportadores em uma única
              plataforma, com o transporte visível no mapa do embarque à entrega.
            </Typography>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="#sobre" className={pillPrimaryLg}>
                Conheça a Rotta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#como-funciona" className={pillGhostLg}>
                Como funciona
              </Link>
            </div>
            {/* Pedido do usuário 02/09/2026: "coloque que disponibilizamos 1
                mês grátis, sem a necessidade de colocar dados para
                pagamento" — o trial de verdade (1 mês, `TRIAL_DURATION_MONTHS`
                em `companies.constants.ts`) até então só aparecia depois do
                clique em "Começar agora", nunca aqui na hero. */}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <Typography variant="bodySmall" className="font-medium">
                1º mês grátis, sem necessidade de cartão de crédito
              </Typography>
            </div>
            <Typography variant="bodySmall" color="muted">
              Tecnologia para conectar. Segurança para tranquilizar.
            </Typography>
          </div>

          <div className="relative flex justify-center pt-4 lg:justify-end lg:pt-0">
            <div className="relative w-full max-w-md">
              {/* Isolamento de erro (pedido do usuário: "o botão Conheça a
                  Rotta não funciona" — investigado, não reproduzido
                  localmente em dev/build de produção/mobile/desktop, mas o
                  mapa (WebGL/MapLibre, `ssr: false`) não tinha nenhum
                  isolamento contra falha de render — se travar num
                  dispositivo/navegador específico sem `SectionErrorBoundary`,
                  o React pode derrubar a hidratação de toda a hero, incluindo
                  os botões ao lado, sem isolamento nenhum. Mesmo padrão já
                  usado em `/rotas/[id]` pra seções independentes.) */}
              <SectionErrorBoundary label="hero-map-demo">
                <HeroMapDemoLazy />
              </SectionErrorBoundary>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Faixa de prova de valor ===== */}
      <section className="relative z-10 mx-auto -mt-6 w-full max-w-6xl px-6 sm:-mt-10">
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-around sm:gap-8 sm:p-8">
          {FAIXA_VALOR.map((item) => (
            <div key={item.titulo} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-4.5 w-4.5" />
              </span>
              <Typography variant="bodySmall" className="font-semibold">
                {item.titulo}
              </Typography>
            </div>
          ))}
        </div>
      </section>

      {/* ===== "O transporte escolar não precisa ser complicado." ===== */}
      <section className="w-full px-6 py-24">
        <Reveal className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col gap-5">
            <Typography variant="headline" as="h2">
              O transporte escolar não precisa ser complicado.
            </Typography>
            <Typography variant="body" color="muted">
              A operação do transporte escolar envolve pessoas, horários, rotas, alunos e muita
              comunicação: motorista, monitor, transportadora e família precisando falar a mesma
              língua, todos os dias. A Rotta organiza tudo isso numa experiência simples, com a rota
              sempre visível para quem precisa acompanhar.
            </Typography>
          </div>

          <div className="relative flex items-center justify-center rounded-3xl border border-border bg-muted p-10">
            <svg viewBox="0 0 320 160" className="h-auto w-full max-w-sm" aria-hidden="true">
              <path
                d="M 24 128 C 90 120, 130 60, 180 48 S 270 32, 296 32"
                className="stroke-primary"
                strokeWidth={3}
                strokeDasharray="1 9"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx={24} cy={128} r={6} className="fill-text" />
              <circle cx={296} cy={32} r={6} className="fill-primary" />
              <circle cx={180} cy={48} r={5} className="fill-card stroke-primary" strokeWidth={2} />
            </svg>
            <div className="absolute bottom-6 left-8 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-text" aria-hidden="true" />
              <Typography variant="caption" color="muted">
                Casa
              </Typography>
            </div>
            <div className="absolute right-8 top-6 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              <Typography variant="caption" color="muted">
                Escola
              </Typography>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Os três públicos ===== */}
      <section className="w-full bg-muted px-6 py-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
          {PUBLICOS.map((bloco, index) => (
            <Reveal key={bloco.id} delayMs={index * 80}>
              <div
                id={bloco.id}
                className={`grid grid-cols-1 items-center gap-10 scroll-mt-24 lg:grid-cols-2 lg:gap-16 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
                  <Image
                    src={bloco.foto.src}
                    alt={bloco.foto.alt}
                    fill
                    sizes="(min-width: 1024px) 520px, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <Typography variant="overline" color="primary">
                    {bloco.titulo}
                  </Typography>
                  <Typography variant="title" as="h3">
                    {bloco.ideia}
                  </Typography>
                  <ul className="flex flex-col gap-2.5">
                    {bloco.recursos.map((recurso) => (
                      <li key={recurso} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <Typography variant="bodySmall" color="muted">
                          {recurso}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={bloco.ctaHref}
                    className="mt-1 flex w-fit items-center gap-1.5 text-sm font-semibold text-primary transition-transform hover:translate-x-0.5"
                  >
                    Conhecer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== "Tudo começa com uma rota." ===== */}
      <section id="como-funciona" className="w-full scroll-mt-20 px-6 py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Reveal>
            <Typography variant="headline" as="h2" className="text-center">
              Tudo começa com uma rota.
            </Typography>
          </Reveal>
          <div className="relative mt-16 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-6">
            <div
              className="absolute left-6 top-6 bottom-6 hidden w-px bg-border lg:left-0 lg:right-0 lg:top-6 lg:h-px lg:w-auto lg:bg-border"
              aria-hidden="true"
            />
            {FLUXO.map((passo, index) => (
              <Reveal key={passo.titulo} delayMs={index * 100} className="relative flex-1">
                <div className="flex flex-col items-start gap-3 lg:items-center lg:text-center">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                    <passo.icon className="h-5 w-5" />
                  </span>
                  <Typography variant="subtitle">{passo.titulo}</Typography>
                  <Typography variant="bodySmall" color="muted" className="lg:max-w-[220px]">
                    {passo.descricao}
                  </Typography>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Produto ===== */}
      <section className="w-full bg-muted px-6 py-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 text-center">
          <Reveal>
            <Typography variant="headline" as="h2">
              A mesma viagem, sob três pontos de vista.
            </Typography>
          </Reveal>
          <Reveal delayMs={80}>
            <Typography variant="body" color="muted" className="max-w-xl">
              Motorista, responsável e transportador acompanham a mesma viagem, cada um vendo
              exatamente o que precisa.
            </Typography>
          </Reveal>
        </div>

        <Reveal
          delayMs={120}
          className="relative mx-auto mt-16 flex w-full max-w-5xl justify-center"
        >
          <div className="relative flex w-full items-center justify-center py-6">
            <div className="hidden shrink-0 -rotate-3 sm:block lg:-translate-x-6">
              <ResponsavelMockup />
            </div>
            <div className="z-10 shrink-0 sm:-mx-8 lg:-mx-10">
              <MotoristaMockup />
            </div>
            <div className="hidden shrink-0 rotate-3 sm:block lg:translate-x-6">
              <TransportadoraMockup />
            </div>
          </div>
        </Reveal>

        <div className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-8 px-2 sm:hidden">
          <TransportadoraMockup />
        </div>

        <div className="mx-auto mt-16 grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            {
              titulo: "Motorista",
              descricao: "Mapa, rota, próxima parada, alunos embarcados e status da viagem.",
            },
            {
              titulo: "Responsável",
              descricao: "Localização do transporte, previsão de chegada e notificações.",
            },
            {
              titulo: "Transportador",
              descricao: "Rotas, viagens, motoristas, monitores e alunos organizados.",
            },
          ].map((item) => (
            <div key={item.titulo} className="flex flex-col gap-1.5 text-center sm:text-left">
              <Typography variant="bodySmall" className="font-semibold">
                {item.titulo}
              </Typography>
              <Typography variant="caption" color="muted">
                {item.descricao}
              </Typography>
            </div>
          ))}
        </div>
      </section>

      {/* ===== "Feita para a rotina real do transporte escolar." ===== */}
      <section className="w-full px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <Reveal>
            <Typography variant="headline" as="h2" className="mb-14 text-center">
              Feita para a rotina real do transporte escolar.
            </Typography>
          </Reveal>
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {ROTINA_REAL.map((item, index) => (
              <Reveal key={item.titulo} delayMs={index * 60}>
                <div className="flex flex-col items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-primary">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <Typography variant="bodySmall" className="font-semibold">
                    {item.titulo}
                  </Typography>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== "Estamos traçando uma nova rota..." ===== */}
      <section id="sobre" className="w-full scroll-mt-20 bg-muted px-6 py-24">
        <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            <Compass className="h-3.5 w-3.5" />
            Sobre a Rotta
          </span>
          <Typography variant="headline" as="h2">
            Estamos traçando uma nova rota para o transporte escolar.
          </Typography>
          <Typography variant="body" color="muted" className="max-w-2xl">
            A Rotta nasceu para tornar o transporte escolar mais organizado e mais conectado, tanto
            para quem transporta quanto para quem confia os filhos a esse serviço todos os dias. Por
            trás de cada viagem, responsáveis, motoristas, monitores e transportadoras trabalham na
            mesma plataforma, com a mesma informação.
          </Typography>
        </Reveal>
      </section>

      {/* ===== CTA final ===== */}
      <section className="w-full bg-primary px-6 py-20">
        <Reveal className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[44px]">
            Pronto para conhecer uma nova forma de cuidar do transporte escolar?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={ROTTA_APP_URL} className={pillOnAccentLg}>
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contato"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-4 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com a Rotta
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
