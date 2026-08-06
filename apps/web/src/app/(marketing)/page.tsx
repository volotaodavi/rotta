import {
  ArrowRight,
  Bell,
  Check,
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
  Wallet,
  Zap,
} from "@rotta/icons";
import { Badge, Button, Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { ComponentType } from "react";

import { AUDIENCIAS, TONE_BG, TONE_TEXT, type AudienceCard } from "@/components/audience-data";
import { HeroAudienceSwitch } from "@/components/hero-audience-switch";
import { HeroMapDemo } from "@/components/hero-map-demo";

const TRUST_CHIPS: { label: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: "Ao vivo, sempre", icon: MapPin },
  { label: "Sem grupo de WhatsApp", icon: Bell },
  { label: "IA valida documentos", icon: ShieldCheck },
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
    titulo: "Escalas com substituição automática",
    descricao: "Motorista ou veículo indisponível? O sistema já aponta quem pode assumir a rota.",
    icon: Repeat,
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

/**
 * Painel visual das seções "para qual lado da rota você está" — mesma
 * linguagem de cartão "solto"/com glow do `HeroMapDemo`/`RottaPayVisual`
 * abaixo, só que com um ícone temático em vez de um mapa (nenhuma foto
 * de estoque: a Rotta não tem fotografia real de motoristas/famílias
 * ainda, então um ícone grande e honesto substitui a fotografia que a
 * Uber usa nesse mesmo tipo de seção).
 */
function AudienceVisual({
  tone,
  icon: Icon,
}: {
  tone: AudienceCard["tone"];
  icon: ComponentType<{ className?: string }>;
}): JSX.Element {
  return (
    <div className="relative aspect-square w-full max-w-sm">
      <div
        className={`absolute -inset-6 rounded-[40px] ${TONE_BG[tone]}/10 blur-2xl`}
        aria-hidden="true"
      />
      <div
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[32px] border border-border ${TONE_BG[tone]}/5`}
      >
        <span
          className={`flex h-28 w-28 items-center justify-center rounded-full ${TONE_BG[tone]} text-white shadow-xl`}
        >
          <Icon className="h-12 w-12" />
        </span>
      </div>
    </div>
  );
}

/** Mini visual do Rotta Pay — mesma referência do painel real (`(dashboard)/rotta-pay`), reconstruído aqui para não cruzar o boundary de route group. Cartão puramente ilustrativo: nenhum meio de pagamento real é emitido. */
function RottaPayVisual(): JSX.Element {
  return (
    <div className="relative w-full max-w-sm rotate-[1.5deg] rounded-3xl bg-gradient-to-br from-white/15 to-transparent p-6 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="h-5 w-5" /> Rotta Pay
        </span>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
          Novo
        </span>
      </div>
      <div className="mt-8">
        <p className="text-xs text-white/70">Saldo disponível</p>
        <p className="mt-1 text-3xl font-bold">R$ 4.280,00</p>
      </div>
      <div className="mt-6 flex items-center gap-2 text-xs text-white/70">
        <Zap className="h-3.5 w-3.5" />
        Extrato atualizado a cada contrato ativado
      </div>
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
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-24 pt-16 sm:pt-24 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-6 text-left">
          <Badge variant="info">Rastreamento ao vivo, sem enrolação</Badge>
          <Typography variant="hero" as="h1">
            Cadê o transporte?
            <br />A Rotta mostra.
          </Typography>
          <Typography variant="body" color="muted" className="max-w-lg">
            Rastreamento ao vivo, embarque e desembarque confirmados, e uma transportadora a um
            toque de distância — sem grupo de WhatsApp, sem ficar no escuro.
          </Typography>
          <HeroAudienceSwitch />
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
        <div className="flex justify-center pt-6 lg:justify-end lg:pt-0">
          <HeroMapDemo />
        </div>
      </section>

      <section className="w-full pt-24">
        <Typography variant="headline" as="h2" className="px-6 text-center">
          Para qual lado da rota você está?
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
            <div className="flex justify-center">
              <AudienceVisual tone={audiencia.tone} icon={audiencia.icon} />
            </div>
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
              <div key={passo.numero} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
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
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
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
              Em rollout — a Rotta está integrando uma provedora de pagamento parceira para
              processar as transferências.
            </Typography>
          </div>
          <div className="flex justify-center lg:justify-end">
            <RottaPayVisual />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <Typography variant="headline" as="h2" className="mb-10 text-center">
          Tudo que uma rota escolar precisa
        </Typography>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((beneficio) => (
            <Card
              key={beneficio.titulo}
              className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <Card.Body className="flex flex-col gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
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
            Chega de ligar perguntando &ldquo;cadê o ônibus?&rdquo;
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
