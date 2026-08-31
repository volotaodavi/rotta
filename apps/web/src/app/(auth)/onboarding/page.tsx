"use client";

import { Button, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ONBOARDING_SEEN_KEY = "rotta_onboarding_seen";

interface Slide {
  id: "rota" | "seguranca" | "conecta";
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: "rota",
    title: "Seu transporte, mais conectado.",
    description: "Tenha as informações da sua viagem organizadas em um só lugar.",
  },
  {
    id: "seguranca",
    title: "Mais segurança em cada viagem.",
    description:
      "Responsáveis acompanham o transporte e motoristas e monitores têm tudo o que precisam durante a rota.",
  },
  {
    id: "conecta",
    title: "Rotta. Conecta. Protege. Tranquiliza.",
    description: "Uma nova forma de organizar e acompanhar o transporte escolar.",
  },
];

/**
 * Ilustração minimalista por slide (Seção 2) — mesmo vocabulário visual
 * de `LoginMascot`/`RouteMark` (formas geométricas simples + azul da
 * marca, nunca emoji/imagem externa), reescrito em SVG inline porque
 * esta é a única página do grupo `(auth)` que precisa de uma
 * ilustração própria por tela.
 */
function OnboardingIllustration({ variant }: { variant: Slide["id"] }): JSX.Element {
  if (variant === "rota") {
    return (
      <svg width="240" height="240" viewBox="0 0 220 220" fill="none" aria-hidden="true">
        <circle cx="110" cy="110" r="100" className="fill-surface" />
        <path
          d="M40 150 C 70 150, 70 90, 110 90 S 150 40, 180 40"
          className="stroke-border"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M40 150 C 70 150, 70 90, 110 90"
          className="stroke-primary"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="40" cy="150" r="7" className="fill-border" />
        <circle cx="110" cy="90" r="11" className="fill-primary" />
        <circle cx="110" cy="90" r="18" className="fill-primary" opacity="0.18" />
        <circle cx="180" cy="40" r="7" className="fill-border" />
      </svg>
    );
  }

  if (variant === "seguranca") {
    return (
      <svg width="240" height="240" viewBox="0 0 220 220" fill="none" aria-hidden="true">
        <circle cx="110" cy="110" r="100" className="fill-surface" />
        <path
          d="M110 60 C 90 60, 76 74, 76 94 C 76 118, 110 150, 110 150 C 110 150, 144 118, 144 94 C 144 74, 130 60, 110 60 Z"
          className="fill-primary"
        />
        <circle cx="110" cy="94" r="13" className="fill-surface" />
        <path
          d="M56 168 L164 168"
          className="stroke-border"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="56" cy="168" r="10" className="fill-success" />
        <circle cx="164" cy="168" r="10" className="fill-primary" />
      </svg>
    );
  }

  return (
    <svg width="240" height="240" viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <circle cx="110" cy="110" r="100" className="fill-surface" />
      <path
        d="M110 60 L156 138 L64 138 Z"
        className="stroke-border"
        strokeWidth="4"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="110" cy="60" r="12" className="fill-primary" />
      <circle cx="156" cy="138" r="12" className="fill-primary" opacity="0.75" />
      <circle cx="64" cy="138" r="12" className="fill-primary" opacity="0.5" />
      <rect x="98" y="158" width="24" height="24" rx="8" className="fill-success" opacity="0.9" />
    </svg>
  );
}

function ProgressDots({ total, activeIndex }: { total: number; activeIndex: number }): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all ${
            index === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Onboarding de 3 telas (Seção 2/14 — "web também tem onboarding, mas
 * não deve parecer propaganda"), mostrado uma vez só por navegador
 * (`localStorage`, mesma ideia do flag `SecureStore` do app nativo,
 * adaptada à API do stack atual). Alcançado a partir do CTA "Criar
 * conta" do site (`(marketing)/layout.tsx`) — nunca inserido na frente
 * de "Entrar" (usuário recorrente segue direto pro login, igual ao
 * fluxo do app nativo). Layout responsivo real (Seção 5): mobile
 * empilha ilustração/texto/CTA; desktop vira duas colunas (ilustração
 * de um lado, texto+CTA do outro) em vez de só esticar o mobile.
 */
export default function OnboardingPage(): JSX.Element {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const isLastSlide = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex]!;

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_SEEN_KEY) === "1") {
        router.replace("/selecionar-perfil");
        return;
      }
    } catch {
      // localStorage indisponível (modo privado restrito) — segue mostrando o onboarding normalmente.
    }
    setReady(true);
  }, [router]);

  function finish(): void {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      // Sem persistência: o onboarding volta a aparecer na próxima visita — não bloqueia o fluxo.
    }
    router.replace("/selecionar-perfil");
  }

  if (!ready) {
    return <div className="min-h-[50vh]" />;
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8 md:flex-row md:items-center md:gap-16">
      <div className="flex flex-col items-center gap-4 md:w-1/2">
        <ProgressDots total={SLIDES.length} activeIndex={activeIndex} />
        <OnboardingIllustration variant={slide.id} />
      </div>

      <div className="flex flex-col items-center gap-3 text-center md:w-1/2 md:items-start md:text-left">
        <Typography variant="headline" className="text-balance">
          {slide.title}
        </Typography>
        <Typography variant="body" color="muted">
          {slide.description}
        </Typography>

        <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row md:w-full">
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              if (isLastSlide) {
                finish();
              } else {
                setActiveIndex((index) => index + 1);
              }
            }}
          >
            {isLastSlide ? "Começar" : "Continuar"}
          </Button>
          {!isLastSlide ? (
            <Button variant="ghost" fullWidth onClick={finish}>
              Pular
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
