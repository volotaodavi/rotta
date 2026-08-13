"use client";

import { Button, Card, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";

import { NotificationPriorityBadge } from "@/features/notifications/components/notification-priority-badge";
import {
  useNotificationsList,
  useSetNotificationArquivada,
} from "@/features/notifications/hooks/use-notifications";
import { NOTIFICATION_TYPE_LABEL } from "@/features/notifications/labels";

/**
 * Histórico de notificações arquivadas (Painel Web) — mesma experiência
 * de `apps/mobile/.../historico-screen.tsx`: arquivar só tira a
 * notificação da Central, nunca a exclui.
 */
export default function NotificacoesArquivadasPage(): JSX.Element {
  const { data, isLoading } = useNotificationsList({ arquivada: true });
  const setArquivada = useSetNotificationArquivada();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Notificações arquivadas</Typography>
        <Link href="/notificacoes" className={buttonVariants({ variant: "ghost" })}>
          Voltar
        </Link>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          {isLoading || !data ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : data.items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhuma notificação arquivada ainda.
            </Typography>
          ) : (
            <div className="flex flex-col gap-2">
              {data.items.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-4"
                >
                  <Link
                    href={`/notificacoes/${notification.id}`}
                    className="flex flex-1 flex-col gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <Typography variant="subtitle" as="span">
                        {notification.titulo}
                      </Typography>
                      <NotificationPriorityBadge prioridade={notification.prioridade} />
                    </div>
                    <Typography variant="caption" color="muted">
                      {NOTIFICATION_TYPE_LABEL[notification.tipo]} ·{" "}
                      {new Date(notification.createdAt).toLocaleString("pt-BR")}
                    </Typography>
                    <Typography variant="body" color="muted" className="line-clamp-2">
                      {notification.corpo}
                    </Typography>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={setArquivada.isPending}
                    onClick={() =>
                      setArquivada.mutate({ notificationId: notification.id, valor: false })
                    }
                  >
                    Desarquivar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
