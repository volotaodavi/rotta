import { LayoutGrid, MapPin, Route as RouteIcon } from "@rotta/icons";

import type { Route } from "next";
import type { ComponentType } from "react";

export interface AudienceCard {
  titulo: string;
  descricao: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: Route;
  tone: "primary" | "neutral" | "success";
  icon: ComponentType<{ className?: string }>;
  /**
   * Só `Company` tem `Plan`/mensalidade (Dossiê 26) — Responsável é
   * 100% gratuito (sem plano, nunca cobrado) e motorista/monitor
   * vinculado (`Sou motorista ou monitor`) entra como funcionário via
   * convite, não como conta que assina nada. Só "Sou transportadora"
   * (empresa, inclusive autônomo com `tipo: AUTONOMO`) de fato tem uma
   * mensalidade — só essa audiência mostra "Ver planos" no seletor da
   * hero (`HeroAudienceSwitch`).
   */
  temPlano: boolean;
}

/**
 * As 3 audiências da Rotta (briefing) — dado compartilhado entre a
 * seção completa "Para qual lado da rota você está?" (`page.tsx`) e o
 * seletor rápido da hero (`HeroAudienceSwitch`), para nunca divergir
 * rótulo/rota entre os dois lugares que decidem "pra onde te mando".
 */
export const AUDIENCIAS: AudienceCard[] = [
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
    tone: "primary",
    icon: MapPin,
    temPlano: false,
  },
  {
    titulo: "Sou transportadora",
    descricao: "Centralize motoristas, veículos, rotas, alunos e recebimentos em um único painel.",
    bullets: [
      "Gestão completa da frota e da equipe",
      "Rotas otimizadas e vínculo de alunos",
      "Rotta Pay: acompanhe o que entra de cada contrato",
    ],
    ctaLabel: "Cadastrar minha empresa",
    ctaHref: "/criar-conta/empresa",
    tone: "neutral",
    icon: LayoutGrid,
    temPlano: true,
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
    tone: "success",
    icon: RouteIcon,
    temPlano: false,
  },
];

export const TONE_BG: Record<AudienceCard["tone"], string> = {
  primary: "bg-primary",
  neutral: "bg-secondary",
  success: "bg-success",
};

export const TONE_TEXT: Record<AudienceCard["tone"], string> = {
  primary: "text-primary",
  neutral: "text-secondary",
  success: "text-success",
};
