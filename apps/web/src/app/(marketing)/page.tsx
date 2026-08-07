import {
  ArrowRight,
  Bell,
  Check,
  Gauge,
  Headset,
  LayoutGrid,
  Link2,
  MapPin,
  PiggyBank,
  Repeat,
  Route as RouteIcon,
  ScanFace,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "@rotta/icons";
import { Badge, Button, Card, Typography } from "@rotta/ui/web";
import Image from "next/image";
import Link from "next/link";

import type { Metadata } from "next";
import type { ComponentType } from "react";

import { AUDIENCIAS, TONE_BG, TONE_TEXT, type AudienceCard } from "@/components/audience-data";
import { HeroAudienceSwitch } from "@/components/hero-audience-switch";
import { HeroMapDemo } from "@/components/hero-map-demo";

/**
 * Título/descrição herdam o padrão do root layout (já otimizados pra
 * home) — aqui só fixamos o `canonical` (Dossiê 12 §7.4: evita que o
 * Google trate `/` e `/?utm=...`/variações como páginas duplicadas) e
 * as palavras-chave reais do produto (nunca termos que a Rotta não
 * atende, tipo "ônibus urbano" ou "transporte de funcionários").
 */
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

/**
 * Grade de 4 destaques logo abaixo do `HeroAudienceSwitch` — substitui
 * os antigos `TRUST_CHIPS` (badges de texto solto) por um bloco mais
 * denso visualmente (ícone + título + descrição curta), no mesmo
 * espírito do banner de referência que o usuário trouxe. Cada item
 * aqui é uma capacidade REAL já documentada em outras seções desta
 * mesma página (`SEGURANCA_ITENS`, `BENEFICIOS`, `COMO_FUNCIONA`) —
 * nunca uma promessa nova inventada só para preencher a grade.
 */
const HERO_DESTAQUES: {
  titulo: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    titulo: "Mais segurança",
    descricao: "CNH, selfie e reconhecimento facial checados por IA.",
    icon: ShieldCheck,
  },
  {
    titulo: "Mais controle",
    descricao: "Motoristas, veículos e rotas num painel só.",
    icon: LayoutGrid,
  },
  {
    titulo: "Mais comunicação",
    descricao: "Notificação automática a cada embarque e desembarque.",
    icon: Bell,
  },
  {
    titulo: "Mais eficiência",
    descricao: "Rota otimizada, recalculada sozinha se um aluno faltar.",
    icon: Gauge,
  },
];

/**
 * Mockup de celular flutuando sobre o `HeroMapDemo` (banner de
 * referência trazido pelo usuário: foto de van + celular na mão). A
 * Rotta não tem fotografia real de van/motorista ainda (Dossiê 24 —
 * nenhuma foto de estoque), então em vez de uma foto genérica de banco
 * de imagens (que pareceria falsa), este é um mockup ilustrado — moldura
 * de aparelho desenhada (não uma foto de mão) com uma prévia da MESMA
 * tela real do app (`TripsService`/embarque-desembarque, Dossiê 13):
 * viagem em andamento, mini-rota e os dois papéis que aparecem nela
 * (aluno a bordo, motorista). Nomes são de exemplo — mesma convenção já
 * usada no cartão "Chegada em X min" do `HeroMapDemo` (dado de
 * demonstração, nunca um cliente real).
 */
function HeroTripPhoneMockup({ className }: { className?: string }): JSX.Element {
  return (
    <div className={`w-40 rotate-[4deg] sm:w-48 ${className ?? ""}`}>
      <div className="rounded-[26px] border-[3px] border-text bg-card p-1.5 shadow-2xl">
        <div className="overflow-hidden rounded-[18px] bg-background">
          <div className="flex justify-center pt-2">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="px-3 pb-3 pt-2">
            <Typography variant="caption" color="muted">
              Viagem em andamento
            </Typography>
            <Typography variant="caption" className="mt-0.5 block font-semibold">
              Trajeto para a escola
            </Typography>

            <svg viewBox="0 0 140 60" className="mt-2 h-auto w-full" aria-hidden="true">
              <path
                d="M 12 48 C 40 40, 55 30, 70 22 S 110 8, 128 12"
                className="stroke-primary"
                strokeWidth={3}
                strokeDasharray="1 8"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx={12} cy={48} r={4} className="fill-secondary" />
              <path
                d="M128 4c-5 0-9 4-9 9 0 7 9 15 9 15s9-8 9-15c0-5-4-9-9-9z"
                className="fill-primary"
              />
            </svg>

            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 rounded-lg bg-success/10 px-2 py-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-[9px] font-bold text-white">
                  ML
                </span>
                <Typography variant="caption" className="flex-1 truncate font-medium">
                  Maria Laura
                </Typography>
                <Typography variant="caption" className="shrink-0 font-semibold text-success">
                  A bordo
                </Typography>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                  CA
                </span>
                <Typography variant="caption" className="flex-1 truncate font-medium">
                  Carlos Alberto
                </Typography>
                <Typography variant="caption" className="shrink-0 font-semibold text-primary">
                  Motorista
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cartão flutuante curto sobre o visual da hero (ex.: "Segurança —
 * Motorista verificado e viagem monitorada"). Cada instância descreve
 * uma capacidade REAL já implementada (`RottaAiService`/Didit para
 * verificação de motorista, GPS ao vivo do módulo Rotas) — nunca um
 * selo decorativo vazio.
 */
function HeroFloatingBadge({
  icon: Icon,
  titulo,
  descricao,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`flex w-56 items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xl ${className ?? ""}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <Typography variant="bodySmall" className="font-semibold">
          {titulo}
        </Typography>
        <Typography variant="caption" color="muted">
          {descricao}
        </Typography>
      </div>
    </div>
  );
}

/**
 * Faixa de confiança logo abaixo da hero (briefing inDrive — bloco
 * curto e sólido reforçando os 3 diferenciais reais antes de qualquer
 * outra seção, sem números inventados: a Rotta não tem estatística de
 * uso pública pra citar aqui, então cada item é uma capacidade real do
 * produto, nunca uma métrica fabricada).
 */
const FAIXA_CONFIANCA: {
  titulo: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { titulo: "GPS funciona em qualquer cidade do Brasil", icon: MapPin },
  { titulo: "CNH, selfie e reconhecimento facial checados por IA", icon: ScanFace },
  { titulo: "Motorista faltou? A escala se ajusta sozinha", icon: Repeat },
];

type ToneCor = "primary" | "info" | "success" | "warning";

const TOM_ICONE: Record<ToneCor, string> = {
  primary: "bg-primary text-white",
  info: "bg-info text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
};

const COMO_FUNCIONA: {
  numero: string;
  titulo: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
  tom: ToneCor;
}[] = [
  {
    numero: "01",
    titulo: "Cadastre-se",
    descricao: "Crie sua conta em minutos — sem burocracia, sem contrato de fidelidade.",
    icon: UserPlus,
    tom: "primary",
  },
  {
    numero: "02",
    titulo: "Vincule sua rota",
    descricao: "Conecte motoristas, veículos, escolas e alunos em poucos cliques.",
    icon: Link2,
    tom: "info",
  },
  {
    numero: "03",
    titulo: "Acompanhe em tempo real",
    descricao: "Veja o transporte se mover no mapa, do embarque até a entrega.",
    icon: MapPin,
    tom: "success",
  },
  {
    numero: "04",
    titulo: "Fique tranquilo",
    descricao: "Notificações automáticas a cada etapa — chega de grupo de WhatsApp.",
    icon: ShieldCheck,
    tom: "warning",
  },
];

/**
 * Checklist da seção "Segurança" — só os 4 itens realmente
 * implementados hoje (`RottaAiService.validateDocument`, integração
 * Didit): CNH validada (OCR + autenticidade do documento), selfie com
 * prova de vida (Passive Liveness — confirma que é uma pessoa real, ao
 * vivo, não uma foto), reconhecimento facial (compara a selfie com o
 * documento) e rastreamento GPS ao vivo (módulo Rotas/GPS, já em
 * produção). Nenhum item aqui é aspiracional — cada um tem um serviço
 * real por trás no backend.
 */
const SEGURANCA_ITENS: {
  titulo: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    titulo: "CNH validada por IA",
    descricao: "OCR confere a autenticidade do documento e a categoria de habilitação exigida.",
    icon: ScanFace,
  },
  {
    titulo: "Selfie com prova de vida",
    descricao: "Confirma que é uma pessoa real, presente na hora, e não uma foto ou vídeo.",
    icon: UserCheck,
  },
  {
    titulo: "Reconhecimento facial",
    descricao: "A selfie é comparada com o documento antes de o motorista rodar.",
    icon: ShieldCheck,
  },
  {
    titulo: "Rastreamento GPS ao vivo",
    descricao: "Do embarque à entrega, com confirmação automática de cada parada.",
    icon: MapPin,
  },
];

/**
 * Deliberadamente só 4 itens (não 6): os dois cortados nesta revisão
 * ("Rastreamento em tempo real", "Comunicação automática") só repetiam,
 * com outras palavras, o que a hero e a seção "Como funciona" já
 * disseram — sintoma exato do "cara de IA" que o usuário reclamou
 * (parágrafos diferentes reafirmando a mesma frase). Os 4 que restam
 * são o que ainda não tinha sido dito na página.
 */
const BENEFICIOS: {
  titulo: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    titulo: "Um painel, ponto final",
    descricao:
      "Motorista, veículo, rota e aluno vivem no mesmo lugar — sem planilha paralela que só uma pessoa da equipe sabe atualizar.",
    icon: LayoutGrid,
  },
  {
    titulo: "Motorista faltou? Já tem substituto",
    descricao:
      "Motorista ou veículo ficou indisponível de última hora — a Rotta já mostra quem pode assumir a rota, sem telefonema desesperado.",
    icon: Repeat,
  },
  {
    titulo: "Menos quilômetro rodado à toa",
    descricao:
      "A ordem de embarque é calculada pra economizar tempo e combustível, e se um aluno faltar, a rota se refaz sozinha.",
    icon: RouteIcon,
  },
  {
    titulo: "Suporte que responde de verdade",
    descricao: "Quando algo trava, tem gente do outro lado — não um bot lendo um script de FAQ.",
    icon: Headset,
  },
];

/**
 * Uma ilustração SVG própria por audiência (Responsável/Transportadora/
 * Motorista/Monitor) — não um ícone genérico dentro de um círculo.
 * Chaveada por `tone` porque `tone` já é 1:1 com a audiência em
 * `AUDIENCIAS` (Dossiê 24 — nenhuma foto de estoque: a Rotta não tem
 * fotografia real de motoristas/famílias ainda, então uma cena vetorial
 * na paleta da marca substitui a fotografia que a Uber usa nesse mesmo
 * tipo de seção, sem fingir uma autenticidade que a Rotta não tem).
 */
/**
 * Fotos reais por audiência (`public/marketing/audiencia-*.jpg`) — 2ª
 * versão enviada pelo usuário: 3 arquivos separados (não mais um
 * banner único recortado por mim), sem botão desenhado dentro da
 * imagem desta vez ("são melhores, já que tem um botão do lado de cada
 * um" — o botão de verdade já vem do nosso próprio `Button`/`Link`
 * abaixo). Motorista e Monitor continuam reaproveitando o mesmo
 * arquivo (só existe uma foto pros dois no material enviado) — texto/
 * bullets de cada audiência continuam distintos (Dossiê 13: motorista
 * dirige e faz checklist do veículo, monitor acompanha os alunos sem
 * dirigir). Chaveado por `titulo`, não por `tone`, por causa desse
 * compartilhamento.
 *
 * `ratio` = largura/altura REAL do arquivo (nunca forçado a quadrado):
 * as fotos de Responsável/Empresas já vêm quase quadradas (~1,39), mas
 * a de Motorista/Monitor é uma faixa bem mais larga (~4,25) — testado
 * e confirmado que qualquer recorte pra encaixar num cartão quadrado
 * cortava ou o texto "Motorista / Monitor" ou o motorista da foto
 * inteiramente. Preservar a proporção original de cada uma é o único
 * jeito de mostrar a foto completa sem perder nenhuma das duas partes.
 */
const AUDIENCE_PHOTO: Record<string, { src: string; alt: string; ratio: number }> = {
  "Sou responsável": {
    src: "/marketing/audiencia-responsavel.jpg",
    alt: "Responsável acompanhando o transporte escolar em tempo real pelo celular",
    ratio: 695 / 501,
  },
  "Sou transportadora": {
    src: "/marketing/audiencia-empresas.jpg",
    alt: "Gestor de transportadora acompanhando a frota pelo painel da Rotta",
    ratio: 699 / 501,
  },
  "Sou motorista": {
    src: "/marketing/audiencia-motorista-monitor.jpg",
    alt: "Motorista de transporte escolar usando o aplicativo da Rotta",
    ratio: 1420 / 334,
  },
  "Sou monitor": {
    src: "/marketing/audiencia-motorista-monitor.jpg",
    alt: "Monitor de transporte escolar usando o aplicativo da Rotta",
    ratio: 1420 / 334,
  },
};

/**
 * Painel visual das seções "escolha como você utiliza a plataforma" —
 * mesma linguagem de cartão "solto"/com glow do
 * `HeroMapDemo`/`RottaPayVisual` abaixo, agora com a foto real de cada
 * audiência (ver `AUDIENCE_PHOTO`) em vez de ilustração/ícone.
 *
 * Clicável (pedido do usuário: "deixe essas imagens clicáveis") — quem
 * renderiza envolve isto num `<Link>` com a classe `group`; os efeitos
 * de hover abaixo (elevação, sombra, chip "Ver mais") reagem a esse
 * `group` do pai, então só aparecem quando o cartão inteiro é
 * hovarado/focado, não só um ponto interno da foto.
 */
function AudienceVisual({
  tone,
  titulo,
  ctaLabel,
}: {
  tone: AudienceCard["tone"];
  titulo: string;
  ctaLabel: string;
}): JSX.Element {
  const photo = AUDIENCE_PHOTO[titulo];
  return (
    <div
      className="relative w-full max-w-sm transition-transform duration-300 group-hover:-translate-y-1.5"
      style={{ aspectRatio: photo?.ratio ?? 1 }}
    >
      <div
        className={`absolute -inset-6 rounded-[40px] ${TONE_BG[tone]}/10 blur-2xl transition-all duration-300 group-hover:blur-3xl group-hover:scale-105`}
        aria-hidden="true"
      />
      <div className="relative h-full w-full overflow-hidden rounded-[32px] border border-border shadow-none transition-shadow duration-300 group-hover:border-border-strong group-hover:shadow-2xl">
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(min-width: 1024px) 384px, 90vw"
            className="object-cover"
          />
        )}
        {/*
          Chip de hover no canto superior direito — livre nas 3 fotos
          atuais (2ª versão enviada pelo usuário, sem botão desenhado
          dentro da imagem desta vez).
        */}
        <div className="absolute right-4 top-4 flex -translate-y-2 items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Typography variant="caption" className={`font-semibold ${TONE_TEXT[tone]}`}>
            {ctaLabel}
          </Typography>
          <ArrowRight className={`h-3.5 w-3.5 ${TONE_TEXT[tone]}`} />
        </div>
      </div>
    </div>
  );
}

/**
 * Banner completo do Rotta Pay — 2ª versão enviada pelo usuário, exibido
 * INTEIRO, sem recorte ("não é pra recortar, é pra poder visualizarem":
 * a 1ª versão eu recortei em pedaços e remontei com texto próprio —
 * `RottaPayVisual`/`LytexPartnerBadge`, ambos removidos — essa aqui é o
 * design pronto, publicado como veio). Mesma parceria já verificada
 * antes de publicar a 1ª versão (LyTex é o provedor real —
 * `lytex.config.ts`/`RottaPayProviderService`, Dossiê 26); a integração
 * de pagamento em si ainda é stub, por isso o aviso "Em rollout" logo
 * abaixo continua existindo fora da imagem. `width`/`height` = dimensão
 * real do arquivo (1774×887, ~2:1) — nunca forçado a quadrado/cortado.
 */
function RottaPayBanner(): JSX.Element {
  return (
    <div className="relative w-full max-w-4xl">
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[48px] bg-white/10 blur-3xl"
        aria-hidden="true"
      />
      <Image
        src="/marketing/rotta-pay-banner.png"
        alt="Rotta Pay, com tecnologia da LyTex Pagamentos: tela do app mostrando saldo disponível e últimos recebimentos, e os diferenciais receba direto na sua conta, taxas justas, mais segurança e saques rápidos"
        width={1774}
        height={887}
        className="w-full rounded-[24px] shadow-2xl"
      />
    </div>
  );
}

/**
 * Landing Page (Dossiê 11, Secao 1; revisitada no Dossiê 26 — desta vez
 * com acesso liberado a uber.com.br, 99app.com, indrive.com/pt-br e
 * cittamobi.com.br dentro da sessão, então a estrutura abaixo reflete
 * as páginas REAIS, não mais reconstrução por conhecimento geral):
 *
 * - Uber: a hero NÃO é um mapa passivo — é um formulário funcional
 *   (origem/destino/CTA). Traduzido pra realidade da Rotta (que não tem
 *   busca pública de transportador antes do cadastro — isso é uma tela
 *   autenticada do app mobile) como `HeroAudienceSwitch`: 3 pills que
 *   decidem o alvo do CTA principal, o mesmo papel que o nav
 *   "Viajar/Ganhe dinheiro" da Uber cumpre lá — sem fingir uma busca que
 *   não existe.
 * - Uber e inDrive: bloco de segurança GRANDE e dedicado (não um card
 *   pequeno perdido num grid) — nova seção "Segurança", só com os 4
 *   itens que a Rotta AI de fato verifica hoje via Didit
 *   (`RottaAiService`).
 * - Cittamobi (o mais parecido com a Rotta: também é "onde está meu
 *   transporte" em tempo real, não ride-hailing) confirma que a divisão
 *   por audiência (Passageiros/Operadores/Cidades lá; Responsável/
 *   Transportadora/Motorista aqui) é o padrão certo — mantida como
 *   blocos GRANDES alternados (texto de um lado, visual do outro).
 *
 * Identidade de cor 100% da Rotta (azul/preto/branco/cinza, Dossiê 24)
 * — nenhuma cor/copy/elemento de marca das referências foi reaproveitado;
 * nenhuma foto de estoque (`AudienceVisual` usa ícone, não fotografia de
 * pessoas) nem badge de app store (o app da Rotta não tem ficha pública
 * ainda).
 */
export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col overflow-x-hidden">
      <section className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-primary/40 blur-[100px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-1/3 -z-10 h-[420px] w-[420px] rounded-full bg-success/25 blur-[100px]"
          aria-hidden="true"
        />
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-28 pt-16 sm:pt-24 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-6 text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Tecnologia que conecta
            </span>
            <Typography variant="hero" as="h1">
              Cadê o transporte?
              <br />
              <span className="text-primary">A Rotta mostra.</span>
            </Typography>
            <Typography variant="body" color="muted" className="max-w-lg">
              Você vê o transporte se mexer no mapa, sabe na hora em que seu filho embarcou e
              desembarcou, e encontra uma transportadora de confiança perto de você — sem precisar
              perguntar pra ninguém.
            </Typography>
            <HeroAudienceSwitch />
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 pt-4 sm:grid-cols-4 sm:gap-x-4">
              {HERO_DESTAQUES.map((item) => (
                <div key={item.titulo} className="flex flex-col gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <Typography variant="bodySmall" className="font-semibold">
                    {item.titulo}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {item.descricao}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex justify-center pt-6 lg:justify-end lg:pt-0">
            <div className="relative w-full max-w-md">
              <div
                className="pointer-events-none absolute -inset-10 -z-10 bg-primary/15 blur-2xl"
                style={{ borderRadius: "63% 37% 54% 46% / 55% 48% 52% 45%" }}
                aria-hidden="true"
              />
              <HeroMapDemo />
              <HeroFloatingBadge
                icon={ShieldCheck}
                titulo="Segurança"
                descricao="Motorista verificado e viagem monitorada."
                className="absolute -left-6 top-6 z-10 hidden sm:flex"
              />
              <HeroTripPhoneMockup className="absolute -right-4 -top-10 z-10 hidden sm:block lg:-right-12" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 w-full max-w-6xl px-6 sm:-mt-16">
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <Typography variant="subtitle">Segurança em cada destino.</Typography>
              <Typography variant="bodySmall" color="muted">
                Confiança em cada trajeto.
              </Typography>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {FAIXA_CONFIANCA.map((item) => (
              <div key={item.titulo} className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 shrink-0 text-primary" />
                <Typography variant="bodySmall" className="font-medium">
                  {item.titulo}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full pt-24">
        <Typography variant="headline" as="h2" className="px-6 text-center">
          Escolha como você utiliza a plataforma
        </Typography>

        {AUDIENCIAS.map((audiencia, index) => {
          const textoBloco = (
            <div className="flex flex-col items-start gap-5">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${TONE_BG[audiencia.tone]}/15`}
              >
                <audiencia.icon className={`h-6 w-6 ${TONE_TEXT[audiencia.tone]}`} />
              </span>
              <Typography variant="display" as="h3">
                {audiencia.titulo}
              </Typography>
              <Typography variant="body" color="muted" className="max-w-md">
                {audiencia.descricao}
              </Typography>
              <ul className="flex flex-col gap-3">
                {audiencia.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <Typography variant="body" color="muted">
                      {bullet}
                    </Typography>
                  </li>
                ))}
              </ul>
              <Link href={audiencia.ctaHref} className="pt-2">
                <Button variant="primary" size="lg">
                  {audiencia.ctaLabel}
                </Button>
              </Link>
            </div>
          );
          const visualBloco = (
            <Link
              href={audiencia.ctaHref}
              aria-label={audiencia.ctaLabel}
              className="group flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              <AudienceVisual
                tone={audiencia.tone}
                titulo={audiencia.titulo}
                ctaLabel={audiencia.ctaLabel}
              />
            </Link>
          );

          return (
            <div key={audiencia.titulo} className={index % 2 === 1 ? "bg-surface" : undefined}>
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2">
                {index % 2 === 1 ? (
                  <>
                    {visualBloco}
                    {textoBloco}
                  </>
                ) : (
                  <>
                    {textoBloco}
                    {visualBloco}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="w-full bg-surface px-6 py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Typography variant="headline" as="h2" className="mb-12 text-center">
            Como funciona
          </Typography>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {COMO_FUNCIONA.map((passo) => (
              <div
                key={passo.numero}
                className="group flex flex-col gap-3 rounded-3xl p-2 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${TOM_ICONE[passo.tom]}`}
                  >
                    <passo.icon className="h-5 w-5" />
                  </span>
                  <Typography variant="headline" className="text-text-muted/40">
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

      <section id="seguranca" className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <Badge variant="success">Segurança</Badge>
            <Typography variant="headline" as="h2">
              Antes de rodar, o motorista já passou pela Rotta AI.
            </Typography>
            <Typography variant="body" color="muted" className="max-w-lg">
              Nenhum motorista sai com o veículo sem verificação de identidade — a mesma tecnologia
              usada pelo mercado financeiro, aplicada ao transporte escolar.
            </Typography>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SEGURANCA_ITENS.map((item) => (
              <Card
                key={item.titulo}
                className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <Card.Body className="flex flex-col gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success transition-transform duration-200 group-hover:scale-110">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <Typography variant="subtitle">{item.titulo}</Typography>
                  <Typography variant="bodySmall" color="muted">
                    {item.descricao}
                  </Typography>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-gradient-to-br from-primary to-primary-hover px-6 py-24 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12">
          <div className="flex max-w-2xl flex-col items-start gap-5">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Novidade
            </span>
            <Typography variant="headline" as="h2" className="text-white">
              Rotta Pay: sua transportadora recebe, você acompanha.
            </Typography>
            <Typography variant="body" className="max-w-lg text-white/80">
              Uma carteira digital dentro da própria Rotta — acompanhe o que entra de cada contrato
              e organize seus saques via PIX, direto pelo painel ou pelo app do motorista.
            </Typography>
            <ul className="flex flex-col gap-2">
              {[
                "Extrato completo de cada contrato ativado",
                "Saques via PIX, sem sair da plataforma",
                "Carteira própria para motoristas autônomos",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-white/90">
                  <PiggyBank className="h-4 w-4 shrink-0" />
                  <Typography variant="bodySmall" className="text-white/90">
                    {item}
                  </Typography>
                </li>
              ))}
            </ul>
            <Typography variant="caption" className="max-w-lg text-white/60">
              Em rollout — a integração de pagamentos com a LyTex está sendo finalizada; até lá, os
              saques passam por processamento manual da equipe Rotta.
            </Typography>
          </div>
          <RottaPayBanner />
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-24">
        <Typography variant="headline" as="h2" className="mb-2 text-center">
          Problemas do dia a dia que a Rotta já resolve
        </Typography>
        <Typography variant="body" color="muted" className="mb-12 text-center">
          Nada aspiracional aqui — cada item abaixo já roda em produção.
        </Typography>
        <div className="flex flex-col divide-y divide-border">
          {BENEFICIOS.map((beneficio, index) => (
            <div key={beneficio.titulo} className="flex items-start gap-5 py-7">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-primary">
                <beneficio.icon className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-1.5">
                <Typography variant="caption" color="muted">
                  {String(index + 1).padStart(2, "0")}
                </Typography>
                <Typography variant="subtitle">{beneficio.titulo}</Typography>
                <Typography variant="bodySmall" color="muted">
                  {beneficio.descricao}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full border-y border-border bg-surface px-6 py-20">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <Typography variant="headline" as="h2">
            Chega de ligar perguntando &ldquo;cadê o transporte?&rdquo;
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
