"use client";

import { Card, Typography } from "@rotta/ui/web";

import { ESCALA, type TurnoDaEscala } from "../escala";

import type { PullRequestDaDiretoria } from "../hooks/use-diretoria";

/**
 * O escritório da diretoria: um boneco por diretor, pedido do fundador
 * em 03/10/2026 ("eu queria ver os bonequinhos trabalhando").
 *
 * A regra que define este componente: **o boneco nunca mente**. O
 * estado dele sai de duas coisas verificáveis, e nada mais.
 *
 * 1. A escala e o relógio de Brasília dizem se o turno daquele cargo
 *    está acontecendo AGORA (dia certo, dentro da janela comercial).
 * 2. A lista de Pull Requests diz se aquele cargo entregou hoje.
 *
 * O que esta tela NÃO consegue saber é se a sessão do agente está de
 * fato rodando neste segundo: isso só a lista de sessões do Claude
 * mostra, e o navegador não tem como perguntar. Por isso o rótulo do
 * boneco em turno diz "em turno" e não "trabalhando agora", e a
 * legenda embaixo manda olhar a sessão para ver o que ele está fazendo.
 * Um boneco digitando animado enquanto nada roda seria exatamente o
 * enfeite fictício que o fundador recusou desde o começo.
 */

export type EstadoDoBoneco = "em-turno" | "entregou" | "folga";

interface DiretorNoEscritorio {
  cargo: TurnoDaEscala["cargo"];
  estado: EstadoDoBoneco;
  legenda: string;
}

const CARGOS: Array<TurnoDaEscala["cargo"]> = ["CEO", "CTO", "CMO", "CFO"];

const NOME_CURTO_DO_DIA: Record<number, string> = {
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
};

/** Minutos desde a meia-noite, para comparar com a janela sem montar Date. */
function emMinutos(hora: string): number {
  const [h = "0", m = "0"] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

export function montarEscritorio(entrada: {
  diaDaSemana: number;
  horaAgora: string;
  janela: { inicio: string; limite: string };
  éDiaDeTrabalho: boolean;
  entregas: PullRequestDaDiretoria[];
  hojeIso: string;
}): DiretorNoEscritorio[] {
  const agora = emMinutos(entrada.horaAgora);
  const dentroDaJanela =
    agora >= emMinutos(entrada.janela.inicio) && agora < emMinutos(entrada.janela.limite);

  return CARGOS.map((cargo) => {
    const entregouHoje = entrada.entregas.find(
      (pr) => pr.cargo === cargo && pr.criadoEm.slice(0, 10) === entrada.hojeIso,
    );
    const turnoHoje = ESCALA.find(
      (turno) => turno.cargo === cargo && turno.diaDaSemana === entrada.diaDaSemana,
    );
    const emTurno = Boolean(turnoHoje) && entrada.éDiaDeTrabalho && dentroDaJanela;

    if (entregouHoje) {
      return {
        cargo,
        estado: "entregou" as const,
        legenda: `entregou hoje: PR #${entregouHoje.numero}`,
      };
    }
    if (emTurno) {
      return {
        cargo,
        estado: "em-turno" as const,
        legenda: `em turno desde ${turnoHoje?.hora}`,
      };
    }

    const proximo = ESCALA.filter((turno) => turno.cargo === cargo).sort(
      (a, b) =>
        ((a.diaDaSemana - entrada.diaDaSemana + 7) % 7) -
        ((b.diaDaSemana - entrada.diaDaSemana + 7) % 7),
    )[0];

    return {
      cargo,
      estado: "folga" as const,
      legenda: proximo
        ? `próximo turno ${NOME_CURTO_DO_DIA[proximo.diaDaSemana] ?? ""} ${proximo.hora}`
        : "fora da escala",
    };
  });
}

const CLASSE_POR_ESTADO: Record<EstadoDoBoneco, string> = {
  "em-turno": "border-primary bg-primary/5",
  entregou: "border-success/50 bg-success/5",
  folga: "border-border",
};

const COR_POR_ESTADO: Record<EstadoDoBoneco, string> = {
  "em-turno": "text-primary",
  entregou: "text-success",
  folga: "text-text-muted",
};

/**
 * O boneco. SVG desenhado aqui, sem biblioteca: é uma figura de seis
 * formas, e carregar um pacote de ilustração para isso seria peso sem
 * motivo. `currentColor` em tudo, então ele acompanha o tema e o
 * estado sem uma segunda paleta.
 */
function Boneco({ estado }: { estado: EstadoDoBoneco }): JSX.Element {
  const digitando = estado === "em-turno";

  return (
    <svg
      viewBox="0 0 80 56"
      className={`h-16 w-auto ${COR_POR_ESTADO[estado]}`}
      role="img"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Monitor: a tela acende em turno e fica apagada na folga. */}
      <rect
        x="52"
        y="14"
        width="24"
        height="22"
        rx="2.5"
        className={digitando ? "animate-boneco-tela" : ""}
        fill={digitando ? "currentColor" : "none"}
        fillOpacity={digitando ? 0.18 : 0}
      />
      <path d="M64 36v13" />
      <path d="M57 49h14" />

      {/* Cabeça apoiada nos ombros: o tronco começa onde a cabeça termina. */}
      <circle cx="20" cy="27" r="7" />
      <path d="M11 50c0-8 4-13 9-13s9 5 9 13" />

      {/* Braço até o teclado, subindo e descendo enquanto o turno acontece. */}
      <g className={digitando ? "animate-boneco-braco origin-[28px_41px]" : ""}>
        <path d="M28 41l11 7" />
      </g>
      <path d="M33 47h16" />

      {/* Mesa. */}
      <path d="M4 50h72" strokeWidth="2.8" />

      {/* Entrega: o visto só aparece quando existe PR de verdade. */}
      {estado === "entregou" ? <path d="M66 7l3.5 3.5L76 3" strokeWidth="3" /> : null}
    </svg>
  );
}

export function Escritorio(props: {
  diaDaSemana: number;
  horaAgora: string;
  janela: { inicio: string; limite: string };
  éDiaDeTrabalho: boolean;
  entregas: PullRequestDaDiretoria[];
  hojeIso: string;
}): JSX.Element {
  const diretores = montarEscritorio(props);

  return (
    <Card>
      <Card.Body className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {diretores.map((diretor) => (
            <div
              key={diretor.cargo}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${CLASSE_POR_ESTADO[diretor.estado]}`}
            >
              <Boneco estado={diretor.estado} />
              <Typography variant="body" className="font-semibold">
                {diretor.cargo}
              </Typography>
              <Typography variant="caption" color="muted">
                {diretor.legenda}
              </Typography>
            </div>
          ))}
        </div>
        <Typography variant="caption" color="muted">
          O boneco fica em turno pelo horário da escala, e ganha o visto quando existe Pull Request
          dele hoje. Para ver o que o agente está fazendo neste instante, abra a sessão dele na
          lista de sessões do Claude: esta tela não tem como perguntar isso, e um boneco digitando
          sem nada rodando seria enfeite.
        </Typography>
      </Card.Body>
    </Card>
  );
}
