import { LayoutGrid, MapPin, Route as RouteIcon, UserCheck } from "@rotta/icons";

import type { Route } from "next";
import type { ComponentType } from "react";

export interface AudienceCard {
  titulo: string;
  descricao: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: Route;
  tone: "primary" | "neutral" | "success" | "info";
  icon: ComponentType<{ className?: string }>;
  /**
   * Só `Company` tem `Plan`/mensalidade (Dossiê 26) — Responsável é
   * 100% gratuito (sem plano, nunca cobrado), motorista contratado e
   * monitor entram como funcionário via convite (não assinam nada).
   * Só "Sou transportadora" (empresa, inclusive motorista autônomo com
   * `tipo: AUTONOMO` — ver `/criar-conta/motorista`) de fato tem uma
   * mensalidade — só essa audiência mostra "Ver planos" no seletor da
   * hero (`HeroAudienceSwitch`).
   */
  temPlano: boolean;
}

/**
 * As 4 audiências da Rotta (briefing) — dado compartilhado entre a
 * seção completa "Para qual lado da rota você está?" (`page.tsx`) e o
 * seletor rápido da hero (`HeroAudienceSwitch`), para nunca divergir
 * rótulo/rota entre os dois lugares que decidem "pra onde te mando".
 *
 * Motorista e Monitor viram cards SEPARADOS (antes eram "Sou motorista
 * ou monitor" combinado) porque têm funcionalidades reais diferentes
 * no app (Dossiê 13, módulo Trips — `trip.monitorId` é um vínculo
 * distinto de `trip.motoristaId`; MONITOR nunca faz checklist de
 * veículo, só MOTORISTA faz): motorista dirige e faz o checklist do
 * veículo, monitor acompanha os alunos e confirma embarque/desembarque
 * sem dirigir. O card de Motorista também não vai direto pra um
 * formulário — primeiro pergunta autônomo/MEI ou contratado
 * (`/criar-conta/motorista`), porque são dois cadastros diferentes por
 * baixo (motorista autônomo = `Company` com `tipo: AUTONOMO`, cobrado
 * a mensalidade; motorista contratado = convite de uma transportadora,
 * gratuito).
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
    titulo: "Sou motorista",
    descricao:
      "Um app simples para dirigir a rota, fazer o checklist do veículo e manter tudo em dia.",
    bullets: [
      "Rota do dia sempre à mão",
      "Registro de embarque/desembarque em 1 toque",
      "Checklist do veículo antes de cada viagem",
    ],
    ctaLabel: "Quero dirigir com a Rotta",
    ctaHref: "/criar-conta/motorista",
    tone: "success",
    icon: RouteIcon,
    temPlano: false,
  },
  {
    titulo: "Sou monitor",
    descricao:
      "Acompanhe os alunos durante o trajeto e confirme cada embarque e desembarque, sem precisar dirigir.",
    bullets: [
      "Rota do dia sempre à mão",
      "Confirmação de embarque/desembarque de cada aluno",
      "Registro de ocorrências na hora, direto pelo app",
    ],
    ctaLabel: "Quero ser monitor na Rotta",
    ctaHref: "/convite",
    tone: "info",
    icon: UserCheck,
    temPlano: false,
  },
];

export const TONE_BG: Record<AudienceCard["tone"], string> = {
  primary: "bg-primary",
  neutral: "bg-secondary",
  success: "bg-success",
  info: "bg-info",
};

export const TONE_TEXT: Record<AudienceCard["tone"], string> = {
  primary: "text-primary",
  neutral: "text-secondary",
  success: "text-success",
  info: "text-info",
};
