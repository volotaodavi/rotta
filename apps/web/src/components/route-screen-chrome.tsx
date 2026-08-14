"use client";

import { ArrowLeft, LocateFixed } from "@rotta/icons";
import { Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { Route } from "next";

/**
 * "Casca" visual compartilhada das telas de mapa em tela cheia (Frente
 * Q — pedido do usuário, imagem de referência de um app de navegação:
 * cartão "Your location"/"Select destinations" + chips de distância/
 * tempo + botão de centralizar no GPS; repaginada na Frente R com uma
 * 2ª referência — app de rastreamento com cartões em gradiente azul e
 * um padrão de onda decorativo). Usada nas 4 frentes citadas pelo
 * usuário — cadastro de aluno pelo Responsável (`/alunos/[id]/mapa`),
 * fim de cadastro de Monitor/Motorista e "Modo Ação" de Autônomo/MEI
 * (todas as 3 últimas caem em `/minha-rota`, `defaultRouteForRole`/
 * guard do Modo Ação já mandam pra lá).
 *
 * Adaptação honesta dos dois banners: o seletor "carro/ônibus/bike/a
 * pé" do 1º banner não existe aqui — a Rotta só tem UM modo de
 * transporte real (o veículo escolar) — e os círculos coloridos
 * "Confirmed/Monitoring/Medical Services" do 2º banner também não:
 * são categorias de caso de COVID, sem equivalente real numa rota
 * escolar, então nunca foram desenhados aqui (fabricar zonas fictícias
 * no mapa seria inventar dado que não existe). O que os dois bannaes
 * têm em comum e SE aplica de verdade — cartão em gradiente com
 * destaque numérico, textura de onda decorativa, chips em vidro fosco
 * — virou o cartão De/Para abaixo, com dado real de rota (distância/
 * tempo/paradas), nunca uma métrica inventada.
 */

/**
 * Textura de onda decorativa (SVG desenhado à mão, mesma disciplina de
 * `HeroTripPhoneMockup`/`RouteMark` — nunca um asset baixado) — o
 * elemento mais reconhecível do banner de referência (o rasgo curvo
 * translúcido no topo de cada cartão azul). Puramente ornamental
 * (`aria-hidden`), branco a 12% de opacidade sobre o gradiente.
 */
function CardWaveDecoration(): JSX.Element {
  return (
    <svg
      viewBox="0 0 400 140"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
      aria-hidden="true"
    >
      <path d="M0 55 C 70 15, 140 90, 210 50 S 340 5, 400 45 L400 0 L0 0 Z" fill="white" />
      <path d="M0 90 C 90 60, 160 130, 260 85 S 360 55, 400 90 L400 140 L0 140 Z" fill="white" />
    </svg>
  );
}

function RouteChip({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex shrink-0 flex-col items-start gap-0.5 rounded-2xl bg-surface-elevated/95 px-3.5 py-2 shadow-lg backdrop-blur">
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="bodySmall" className="font-semibold leading-none">
        {value}
      </Typography>
    </div>
  );
}

/**
 * Cartão "De/Para" flutuante no topo do mapa — ponto de origem (bolinha
 * branca) e destino (pino), ligados por uma linha vertical pontilhada,
 * mesma leitura visual do 1º banner de referência ("Your location" →
 * "Select destinations"). Fundo em gradiente azul + textura de onda
 * (2º banner) — único cartão cromático saturado da tela, o resto do
 * mapa continua neutro. `onVoltar` aceita tanto um link real quanto um
 * callback (páginas diferentes voltam de jeitos diferentes).
 */
export function RouteFromToCard({
  voltarHref,
  onVoltar,
  origemLabel,
  destinoLabel,
  chips,
}: {
  voltarHref?: Route;
  onVoltar?: () => void;
  origemLabel: string;
  destinoLabel: string;
  chips?: { label: string; value: string }[];
}): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 p-4">
      <div className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-primary to-primary-hover p-4 text-white shadow-xl">
        <CardWaveDecoration />
        {voltarHref ? (
          <Link
            href={voltarHref}
            aria-label="Voltar"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : onVoltar ? (
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="relative flex flex-1 flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 shrink-0 items-center justify-center">
              <span className="h-2 w-2 rounded-full border-2 border-white bg-transparent" />
            </span>
            <Typography variant="bodySmall" className="truncate font-medium text-white">
              {origemLabel}
            </Typography>
          </div>
          <div className="ml-[4.5px] h-3 w-px border-l border-dashed border-white/40" />
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
            <Typography variant="bodySmall" className="truncate font-medium text-white">
              {destinoLabel}
            </Typography>
          </div>
        </div>
      </div>

      {chips && chips.length > 0 && (
        <div className="pointer-events-auto flex gap-2 overflow-x-auto">
          {chips.map((chip) => (
            <RouteChip key={chip.label} label={chip.label} value={chip.value} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Botão flutuante "centralizar no meu GPS" (banner de referência:
 * círculo com mira, canto inferior direito, acima da barra de baixo).
 * Funciona de verdade: `RottaMap` só lê `initialCenter` na montagem
 * (não existe API imperativa de recentralizar no pacote hoje), então a
 * página chamadora troca a `key` do mapa a cada clique — remonta com o
 * GPS mais recente em vez de só decorar o botão sem fazer nada.
 */
export function RecenterButton({
  onClick,
  isLoading,
  className = "",
}: {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label="Centralizar no meu GPS"
      title="Centralizar no meu GPS"
      className={`pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-elevated/95 text-text shadow-lg backdrop-blur transition-colors hover:text-primary disabled:opacity-60 ${className}`}
    >
      {isLoading ? <Spinner size="sm" /> : <LocateFixed className="h-5 w-5" />}
    </button>
  );
}
