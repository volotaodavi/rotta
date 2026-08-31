"use client";

import { Car, Check, ClipboardCheck, Heart } from "@rotta/icons";
import { Button, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { LucideIcon } from "@rotta/icons";

const ONBOARDING_SEEN_KEY = "rotta_onboarding_seen";

type Perfil = "responsavel" | "motorista" | "monitor";

const OPCOES: { id: Perfil; title: string; description: string; icon: LucideIcon }[] = [
  {
    id: "responsavel",
    title: "Responsável",
    description: "Para acompanhar o transporte do seu filho.",
    icon: Heart,
  },
  {
    id: "motorista",
    title: "Motorista",
    description: "Para conduzir e gerenciar suas viagens.",
    icon: Car,
  },
  {
    id: "monitor",
    title: "Monitor(a)",
    description: "Para acompanhar os alunos durante a rota.",
    icon: ClipboardCheck,
  },
];

/**
 * "Como você utiliza a Rotta?" (Seção 3) — paridade com
 * `apps/mobile/.../role-selection-screen.tsx`. Login continua único e
 * independente de papel (`/entrar` já resolve isso pelo backend); esta
 * tela só decide o destino do CADASTRO: Responsável cai em
 * `/criar-conta/pessoal`, Motorista/Monitor em `/criar-conta/profissional`
 * (já cobre "criar empresa", "convite" e "autônomo" pros dois papéis —
 * nenhuma rota nova precisou ser criada para o cadastro em si).
 */
export default function SelecionarPerfilPage(): JSX.Element {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState<Perfil | null>(null);
  const [ready, setReady] = useState(false);

  // Onboarding só na primeira visita (mesmo flag que `/onboarding` grava)
  // — quem chega direto aqui (link salvo, digitado) e nunca viu o
  // onboarding é mandado pra lá primeiro; quem já viu, ou é usuário
  // recorrente, permanece direto nesta tela.
  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_SEEN_KEY) !== "1") {
        router.replace("/onboarding");
        return;
      }
    } catch {
      // localStorage indisponível — segue mostrando a seleção de perfil normalmente.
    }
    setReady(true);
  }, [router]);

  function handleContinuar(): void {
    if (!selecionado) return;
    router.push(
      selecionado === "responsavel" ? "/criar-conta/pessoal" : "/criar-conta/profissional",
    );
  }

  if (!ready) {
    return <div className="min-h-[50vh]" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Como você utiliza a Rotta?</Typography>
        <Typography variant="bodySmall" color="muted">
          Escolha seu perfil para continuar.
        </Typography>
      </div>

      <div className="flex flex-col gap-3" role="radiogroup">
        {OPCOES.map((opcao) => {
          const Icon = opcao.icon;
          const selected = selecionado === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelecionado(opcao.id)}
              className={`flex items-center gap-3 rounded-2xl border bg-surface-elevated p-4 text-left transition-colors ${
                selected ? "border-2 border-primary" : "border-border hover:border-text-muted"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  selected ? "bg-primary-muted text-primary" : "bg-muted text-text-muted"
                }`}
              >
                <Icon size={22} />
              </span>
              <span className="flex-1">
                <Typography variant="body" className="font-semibold">
                  {opcao.title}
                </Typography>
                <Typography variant="caption" color="muted">
                  {opcao.description}
                </Typography>
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-primary bg-primary text-white" : "border-border"
                }`}
              >
                {selected ? <Check size={14} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="primary" fullWidth isDisabled={!selecionado} onClick={handleContinuar}>
          Continuar
        </Button>
        <Typography variant="bodySmall" color="muted" className="text-center">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-primary">
            Entrar
          </Link>
        </Typography>
      </div>
    </div>
  );
}
