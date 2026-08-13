"use client";

import { useEffect, useState } from "react";

import { Typography } from "../../atoms/Typography";
import { cn } from "../../utils/cn";

/**
 * PanelGreeting — cabeçalho de saudação com relógio ao vivo, usado no
 * topo dos painéis "ERP" de `apps/web` (Minha Empresa) e `apps/admin`
 * (Painel Rotta) — pedido do usuário (imagem de referência de ERP de
 * RH: "Good afternoon Ahmed! 11:30 AM ... Sunday, 22 Oct 2023"),
 * adaptado ao padrão da Rotta (`Typography`, tokens de cor).
 *
 * Relógio nasce `null` e só recebe a hora real depois de montar no
 * cliente (`useEffect`) — server-side sempre renderizaria uma hora
 * "congelada" no momento do build/request, que divergiria do relógio
 * real do navegador e disparava aviso de hidratação (mesmo problema já
 * resolvido em `app/layout.tsx` pro tema).
 */
export interface PanelGreetingProps {
  /** Primeiro nome (ou nome completo) de quem está logado. */
  nome: string;
  className?: string;
}

function saudacaoPorHora(hora: number): string {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function PanelGreeting({ nome, className }: PanelGreetingProps) {
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const intervalId = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <Typography variant="title">
        {saudacaoPorHora(agora?.getHours() ?? 12)}, {nome}!
      </Typography>
      {agora ? (
        <div className="flex items-center gap-3">
          <Typography variant="subtitle" as="span" className="tabular-nums">
            {agora.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </Typography>
          <Typography variant="bodySmall" as="span" color="muted" className="capitalize">
            {agora.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </Typography>
        </div>
      ) : null}
    </div>
  );
}
