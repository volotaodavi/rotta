import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListNotificationsParams, UpdateNotificationPreferenceInput } from "@rotta/api-client";

import { notificationsApi } from "@/lib/api-client";


/**
 * Hooks de dados da Central de Notificações Internas no app mobile
 * (Dossiê 11 §4.4/4.6, briefing "NOTIFICAÇÕES INTERNAS") — o inbox é
 * sempre pessoal (nenhum destes hooks recebe `userId`: a API já escopa
 * tudo ao ator autenticado, mesma garantia de `useMyVehicle`).
 */
const LIST_KEY = ["notifications", "list"] as const;
const PREFERENCE_KEY = ["notifications", "preferencia"] as const;

export function useNotificationsList(filter: ListNotificationsParams) {
  return useQuery({
    queryKey: [...LIST_KEY, filter],
    queryFn: () => notificationsApi.list(filter),
  });
}

/** Contagem de não lidas (ativas, não arquivadas) — usada no selo da aba `Notificacoes`. */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: [...LIST_KEY, "unread-count"],
    queryFn: () => notificationsApi.list({ lida: false, arquivada: false, pageSize: 1 }),
    select: (result) => result.total,
  });
}

export function useNotification(notificationId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", "detalhes", notificationId],
    queryFn: () => notificationsApi.getById(notificationId as string),
    enabled: Boolean(notificationId),
  });
}

function useInvalidateNotificationLists() {
  const queryClient = useQueryClient();
  return (notificationId?: string) => {
    void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    if (notificationId) {
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "detalhes", notificationId],
      });
    }
  };
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotificationLists();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
    onSuccess: (notification) => invalidate(notification.id),
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotificationLists();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => invalidate(),
  });
}

export function useSetNotificationFavorita() {
  const invalidate = useInvalidateNotificationLists();
  return useMutation({
    mutationFn: ({ notificationId, valor }: { notificationId: string; valor: boolean }) =>
      notificationsApi.setFavorita(notificationId, valor),
    onSuccess: (notification) => invalidate(notification.id),
  });
}

export function useSetNotificationArquivada() {
  const invalidate = useInvalidateNotificationLists();
  return useMutation({
    mutationFn: ({ notificationId, valor }: { notificationId: string; valor: boolean }) =>
      notificationsApi.setArquivada(notificationId, valor),
    onSuccess: (notification) => invalidate(notification.id),
  });
}

export function useDeleteNotification() {
  const invalidate = useInvalidateNotificationLists();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.remove(notificationId),
    onSuccess: (_result, notificationId) => invalidate(notificationId),
  });
}

export function useNotificationPreference() {
  return useQuery({
    queryKey: PREFERENCE_KEY,
    queryFn: () => notificationsApi.getPreference(),
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferenceInput) =>
      notificationsApi.updatePreference(input),
    onSuccess: (preference) => {
      queryClient.setQueryData(PREFERENCE_KEY, preference);
    },
  });
}
