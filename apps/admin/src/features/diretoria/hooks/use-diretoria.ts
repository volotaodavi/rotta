"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Os dados da diretoria vêm do próprio repositório, que é a fonte de
 * verdade dela (`empresa/`), e da lista de Pull Requests do GitHub.
 *
 * Por que não passa pela API da Rotta: esses arquivos não são dado de
 * transportadora nenhuma, não têm `companyId`, não entram no banco e
 * mudam por commit. Criar tabela, módulo e endpoint para servir
 * markdown que o git já versiona seria duplicar a verdade em dois
 * lugares, e o segundo lugar envelheceria. O repositório é público,
 * então o navegador lê direto, sem credencial.
 *
 * Se o repositório deixar de ser público, estas consultas passam a
 * falhar e a tela mostra o motivo em cada bloco, sem quebrar: a escala
 * (que é local) continua aparecendo.
 */
const REPO = "volotaodavi/rotta";
/** A branch que a Vercel e o Render publicam, e onde `empresa/` vive. */
const BRANCH = "claude/rotta-platform-design-gr0xzq";
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/empresa`;

/** 5 minutos: markdown de governança não muda de minuto em minuto, e a API pública do GitHub limita por IP. */
const INTERVALO_MS = 5 * 60 * 1000;

async function lerArquivo(nome: string): Promise<string> {
  const resposta = await fetch(`${RAW}/${nome}`, { cache: "no-store" });
  if (!resposta.ok) {
    throw new Error(`Não foi possível ler empresa/${nome} (HTTP ${resposta.status}).`);
  }
  return resposta.text();
}

export interface DecisaoDeTurno {
  /** Cabeçalho do bloco, ex. "2026-10-03 — CTO". */
  titulo: string;
  data: string;
  cargo: string;
  /** Os campos do registro, já separados: "Fiz", "Por que...", etc. */
  campos: Array<{ rotulo: string; texto: string }>;
}

/**
 * Quebra `DECISOES.md` nos blocos de turno. O formato é fixo pelo
 * protocolo (`## AAAA-MM-DD — CARGO` e linhas `**Rótulo:** texto`),
 * então um parser simples basta e qualquer desvio aparece como bloco
 * sem campos, nunca como tela quebrada.
 */
export function separarDecisoes(markdown: string): DecisaoDeTurno[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((bloco) => {
      const [cabecalho = "", ...resto] = bloco.split("\n");
      const titulo = cabecalho.trim();
      const [data = "", cargo = ""] = titulo.split(/\s+[—-]\s+/);
      const campos: Array<{ rotulo: string; texto: string }> = [];

      for (const linha of resto) {
        const achado = /^\*\*(.+?):\*\*\s*(.*)$/.exec(linha.trim());
        if (achado?.[1]) {
          campos.push({ rotulo: achado[1], texto: achado[2]?.trim() ?? "" });
          continue;
        }
        // Continuação de um campo de várias linhas (lista, por exemplo).
        const ultimo = campos[campos.length - 1];
        const texto = linha.trim();
        if (ultimo && texto) ultimo.texto = `${ultimo.texto} ${texto}`.trim();
      }

      return { titulo, data: data.trim(), cargo: cargo.trim(), campos };
    });
}

export interface ItemDeBacklog {
  cargo: string;
  texto: string;
  prioridade: boolean;
  /** `true` nos itens da seção que só o fundador pode fazer. */
  doFundador: boolean;
}

/** Lê os itens em aberto (`- [ ]`) do backlog, com o cargo responsável. */
export function separarBacklog(markdown: string): ItemDeBacklog[] {
  const itens: ItemDeBacklog[] = [];
  let doFundador = false;
  let atual: ItemDeBacklog | null = null;

  for (const linha of markdown.split("\n")) {
    if (/^##\s/.test(linha)) {
      doFundador = /fundador/i.test(linha);
      atual = null;
      continue;
    }
    const aberto = /^- \[ \]\s*(?:\((\w+)\)\s*)?(.*)$/.exec(linha);
    if (aberto) {
      atual = {
        cargo: aberto[1] ?? (doFundador ? "FUNDADOR" : "?"),
        texto: (aberto[2] ?? "").trim(),
        prioridade: /\[prioridade\]/i.test(linha),
        doFundador,
      };
      itens.push(atual);
      continue;
    }
    if (atual && /^\s{4,}\S/.test(linha)) {
      atual.texto = `${atual.texto} ${linha.trim()}`.trim();
    } else if (!linha.trim()) {
      atual = null;
    }
  }

  return itens.map((item) => ({
    ...item,
    texto: item.texto
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\[prioridade\]/gi, "")
      .trim(),
  }));
}

/** O `MODO:` que governa o gasto da companhia, lido de `FUNDADOR.md`. */
export function lerModo(markdown: string): { modo: string; ordemDoFundador: string | null } {
  const modo = /^##\s*MODO:\s*(\w+)/m.exec(markdown)?.[1] ?? "desconhecido";
  const ordem = /^##\s*ORDEM DO FUNDADOR\s*\n([\s\S]*?)(?=\n##\s|$)/m.exec(markdown)?.[1];
  return { modo, ordemDoFundador: ordem?.trim() || null };
}

export function useGovernanca() {
  return useQuery({
    queryKey: ["diretoria", "governanca"],
    queryFn: async () => {
      const [fundador, decisoes, backlog] = await Promise.all([
        lerArquivo("FUNDADOR.md"),
        lerArquivo("DECISOES.md"),
        lerArquivo("BACKLOG.md"),
      ]);
      return {
        ...lerModo(fundador),
        decisoes: separarDecisoes(decisoes),
        backlog: separarBacklog(backlog),
      };
    },
    refetchInterval: INTERVALO_MS,
    staleTime: INTERVALO_MS,
  });
}

export interface PullRequestDaDiretoria {
  numero: number;
  titulo: string;
  cargo: string;
  estado: "aberto" | "fundido" | "fechado";
  criadoEm: string;
  url: string;
}

const CARGO_POR_BRANCH = /^empresa\/(ceo|cto|cmo|cfo)\//i;

export function usePullRequestsDaDiretoria() {
  return useQuery({
    queryKey: ["diretoria", "pull-requests"],
    queryFn: async (): Promise<PullRequestDaDiretoria[]> => {
      const resposta = await fetch(
        `https://api.github.com/repos/${REPO}/pulls?state=all&per_page=30&sort=created&direction=desc`,
        { cache: "no-store", headers: { Accept: "application/vnd.github+json" } },
      );
      if (!resposta.ok) {
        throw new Error(`O GitHub respondeu HTTP ${resposta.status}.`);
      }
      const bruto = (await resposta.json()) as Array<{
        number: number;
        title: string;
        html_url: string;
        created_at: string;
        merged_at: string | null;
        state: string;
        head: { ref: string };
      }>;

      return bruto
        .filter((pr) => CARGO_POR_BRANCH.test(pr.head.ref))
        .map((pr) => ({
          numero: pr.number,
          titulo: pr.title,
          cargo: (CARGO_POR_BRANCH.exec(pr.head.ref)?.[1] ?? "").toUpperCase(),
          estado: pr.merged_at ? "fundido" : pr.state === "open" ? "aberto" : "fechado",
          criadoEm: pr.created_at,
          url: pr.html_url,
        }));
    },
    refetchInterval: INTERVALO_MS,
    staleTime: INTERVALO_MS,
  });
}

export const LINKS_DA_DIRETORIA = {
  empresa: `https://github.com/${REPO}/tree/${BRANCH}/empresa`,
  fundador: `https://github.com/${REPO}/blob/${BRANCH}/empresa/FUNDADOR.md`,
  calendario: `https://github.com/${REPO}/blob/${BRANCH}/empresa/CALENDARIO.md`,
  decisoes: `https://github.com/${REPO}/blob/${BRANCH}/empresa/DECISOES.md`,
  backlog: `https://github.com/${REPO}/blob/${BRANCH}/empresa/BACKLOG.md`,
  pulls: `https://github.com/${REPO}/pulls`,
  sessoes: "https://claude.ai/code",
} as const;
