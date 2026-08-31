"use client";

import { Megaphone, X } from "@rotta/icons";
import { Card, Typography } from "@rotta/ui/web";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { planNoticesApi } from "@/lib/api-client";

/** Mesmo padrão de `PostSignupIdentityPopup` — dispensado uma vez, nunca mais reaparece pra ESTE aviso específico (chave por `notice.id`, não por usuário). */
const STORAGE_PREFIX = "rotta-plan-notice-dispensado:";

/**
 * Banner de avisos de plano (Dossiê 26, painel Admin "Controle de
 * Planos") — o backend (`GET /billing/notices`) já funcionava ponta a
 * ponta, mas nenhuma tela em nenhum app o consumia: o Admin Rotta podia
 * criar e ativar um aviso que nunca chegava a ninguém. Só
 * `Role.EMPRESA`/`Role.GESTOR` têm avisos de plano (o mesmo papel que o
 * endpoint restringe) — o layout do dashboard só renderiza isto pra
 * esses dois papéis.
 */
export function PlanNoticesBanner(): JSX.Element | null {
  const { data: notices } = useQuery({
    queryKey: ["plan-notices", "mine"],
    queryFn: () => planNoticesApi.listMine(),
    staleTime: 5 * 60 * 1000,
  });

  const [dispensados, setDispensados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!notices) return;
    const jaVistos = notices
      .filter((notice) => localStorage.getItem(STORAGE_PREFIX + notice.id) === "1")
      .map((notice) => notice.id);
    if (jaVistos.length > 0) setDispensados(new Set(jaVistos));
  }, [notices]);

  function dispensar(noticeId: string): void {
    localStorage.setItem(STORAGE_PREFIX + noticeId, "1");
    setDispensados((atual) => new Set(atual).add(noticeId));
  }

  const visiveis = (notices ?? []).filter((notice) => !dispensados.has(notice.id));
  if (visiveis.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {visiveis.map((notice) => (
        <Card key={notice.id} className="border-primary/30 bg-primary/5">
          <Card.Body className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Megaphone className="h-4 w-4" />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <Typography variant="subtitle">{notice.titulo}</Typography>
              <Typography variant="bodySmall" color="muted">
                {notice.corpo}
              </Typography>
            </div>
            <button
              type="button"
              onClick={() => dispensar(notice.id)}
              aria-label="Dispensar aviso"
              className="shrink-0 rounded p-1 text-text-muted hover:bg-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}
