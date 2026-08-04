"use client";

import { Badge, Button, Card, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

import { NotificationPriorityBadge } from "@/features/notifications/components/notification-priority-badge";
import {
  useDeleteNotification,
  useMarkNotificationRead,
  useNotification,
  useSetNotificationArquivada,
  useSetNotificationFavorita,
} from "@/features/notifications/hooks/use-notifications";
import {
  COMMUNICATION_CHANNEL_LABEL,
  NOTIFICATION_TYPE_LABEL,
} from "@/features/notifications/labels";

/**
 * Detalhe de uma notificação (Painel Web) — mesma experiência de
 * `apps/mobile/.../detalhes-screen.tsx`: marca como lida automaticamente
 * ao abrir, e reúne as ações do inbox pessoal (favoritar, arquivar,
 * excluir).
 */
export default function NotificacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const router = useRouter();
  const { data: notification, isLoading } = useNotification(id);
  const markRead = useMarkNotificationRead();
  const setFavorita = useSetNotificationFavorita();
  const setArquivada = useSetNotificationArquivada();
  const deleteNotification = useDeleteNotification();

  useEffect(() => {
    if (notification && !notification.lida) {
      markRead.mutate(notification.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id, notification?.lida]);

  if (isLoading || !notification) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  function handleExcluir(): void {
    if (!window.confirm("Esta notificação será removida do seu histórico. Deseja continuar?")) {
      return;
    }
    deleteNotification.mutate(id, {
      onSuccess: () => router.push("/notificacoes"),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Typography variant="title">{notification.titulo}</Typography>
          <NotificationPriorityBadge prioridade={notification.prioridade} />
        </div>
        <Button variant="ghost" onClick={() => router.push("/notificacoes")}>
          Voltar
        </Button>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="caption" color="muted">
            {NOTIFICATION_TYPE_LABEL[notification.tipo]} ·{" "}
            {new Date(notification.createdAt).toLocaleString("pt-BR")}
          </Typography>
          <Typography variant="body">{notification.corpo}</Typography>
          {notification.canaisEscolhidos.length > 0 && (
            <div className="flex items-center gap-2">
              <Typography variant="caption" color="muted">
                Enviada por:
              </Typography>
              {notification.canaisEscolhidos.map((canal) => (
                <Badge key={canal} variant="neutral">
                  {COMMUNICATION_CHANNEL_LABEL[canal]}
                </Badge>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          isLoading={setFavorita.isPending}
          onClick={() =>
            setFavorita.mutate({ notificationId: id, valor: !notification.favoritada })
          }
        >
          {notification.favoritada ? "★ Remover dos favoritos" : "☆ Favoritar"}
        </Button>
        <Button
          variant="secondary"
          isLoading={setArquivada.isPending}
          onClick={() =>
            setArquivada.mutate({ notificationId: id, valor: !notification.arquivada })
          }
        >
          {notification.arquivada ? "Desarquivar" : "Arquivar"}
        </Button>
        <Button variant="ghost" isLoading={deleteNotification.isPending} onClick={handleExcluir}>
          Excluir
        </Button>
      </div>
    </div>
  );
}
