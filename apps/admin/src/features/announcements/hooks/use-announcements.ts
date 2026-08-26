"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateAnnouncementInput, ListAnnouncementsParams } from "@rotta/api-client";

import { announcementsApi } from "@/lib/api-client";

/** Hooks de dados do módulo Avisos/Comunicados — exclusivo de Admin Rotta. */
export function useAnnouncements(params: ListAnnouncementsParams = {}) {
  return useQuery({
    queryKey: ["announcements", params],
    queryFn: () => announcementsApi.list(params),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => announcementsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}
