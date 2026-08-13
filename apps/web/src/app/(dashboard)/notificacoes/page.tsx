"use client";

import { Star } from "@rotta/icons";
import {
  Badge,
  Button,
  Card,
  Input,
  Spinner,
  Tabs,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { ListNotificationsParams } from "@rotta/api-client";

import { NotificationPriorityBadge } from "@/features/notifications/components/notification-priority-badge";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "@/features/notifications/hooks/use-notifications";
import { NOTIFICATION_TYPE_LABEL } from "@/features/notifications/labels";

type FiltroRapido = "todas" | "nao_lidas" | "favoritas";

const TABS = [
  { id: "todas", label: "Todas" },
  { id: "nao_lidas", label: "Não lidas" },
  { id: "favoritas", label: "Favoritas" },
];

function filtroParaParams(filtro: FiltroRapido, search: string): ListNotificationsParams {
  const base: ListNotificationsParams = { arquivada: false, search: search || undefined };
  if (filtro === "nao_lidas") return { ...base, lida: false };
  if (filtro === "favoritas") return { ...base, favoritada: true };
  return base;
}

/**
 * Central de Notificações Internas (Painel Web) — mesma experiência de
 * `apps/mobile/.../central-screen.tsx`: lista pessoal (independente do
 * canal efetivo de envio), filtros rápidos, e acesso às preferências de
 * canal/Quiet Hours e ao histórico de arquivadas.
 */
export default function NotificacoesPage(): JSX.Element {
  const [filtro, setFiltro] = useState<FiltroRapido>("todas");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useNotificationsList(filtroParaParams(filtro, search));
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Notificações</Typography>
        <div className="flex gap-3">
          <Link href="/notificacoes/arquivadas" className={buttonVariants({ variant: "ghost" })}>
            Arquivadas
          </Link>
          <Link
            href="/notificacoes/preferencias"
            className={buttonVariants({ variant: "secondary" })}
          >
            Preferências
          </Link>
        </div>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Tabs tabs={TABS} activeId={filtro} onChange={(id) => setFiltro(id as FiltroRapido)} />

          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Buscar por título ou corpo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              isLoading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Marcar todas como lidas
            </Button>
          </div>

          {isLoading || !data ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : data.items.length === 0 ? (
            <Typography variant="body" color="muted">
              {filtro === "nao_lidas"
                ? "Nenhuma notificação não lida."
                : filtro === "favoritas"
                  ? "Nenhuma notificação favoritada ainda."
                  : "Nenhuma notificação recebida ainda."}
            </Typography>
          ) : (
            <div className="flex flex-col gap-2">
              {data.items.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/notificacoes/${notification.id}`}
                  onClick={() => {
                    if (!notification.lida) markRead.mutate(notification.id);
                  }}
                  className="flex flex-col gap-1 rounded-md border border-border p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Typography variant="subtitle" as="span">
                      {notification.titulo}
                    </Typography>
                    <div className="flex items-center gap-2">
                      {!notification.lida && <Badge variant="info">Não lida</Badge>}
                      {notification.favoritada && (
                        <Badge variant="neutral">
                          <Star size={12} fill="currentColor" aria-label="Favoritada" />
                        </Badge>
                      )}
                      <NotificationPriorityBadge prioridade={notification.prioridade} />
                    </div>
                  </div>
                  <Typography variant="caption" color="muted">
                    {NOTIFICATION_TYPE_LABEL[notification.tipo]} ·{" "}
                    {new Date(notification.createdAt).toLocaleString("pt-BR")}
                  </Typography>
                  <Typography variant="body" color="muted" className="line-clamp-2">
                    {notification.corpo}
                  </Typography>
                </Link>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
