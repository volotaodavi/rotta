"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateLegalDocumentInput,
  CreateLegalDocumentVersionInput,
  UpdateLegalDocumentVersionInput,
} from "@rotta/api-client";

import { legalDocumentsApi } from "@/lib/api-client";

/** Hooks de dados do CMS de documentos legais (Dossiê 45 FRENTE 4, tarefa #205). */
export function useLegalDocuments() {
  return useQuery({
    queryKey: ["legal-documents"],
    queryFn: () => legalDocumentsApi.listDocuments(),
  });
}

export function useLegalDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["legal-documents", id],
    queryFn: () => legalDocumentsApi.getDocument(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateLegalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLegalDocumentInput) => legalDocumentsApi.createDocument(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["legal-documents"] }),
  });
}

export function useCreateLegalDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLegalDocumentVersionInput) =>
      legalDocumentsApi.createVersion(documentId, input),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["legal-documents", documentId] }),
  });
}

export function useUpdateLegalDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      versionId,
      input,
    }: {
      versionId: string;
      input: UpdateLegalDocumentVersionInput;
    }) => legalDocumentsApi.updateVersion(documentId, versionId, input),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["legal-documents", documentId] }),
  });
}

export function useSubmitLegalDocumentVersionForReview(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => legalDocumentsApi.submitForReview(documentId, versionId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["legal-documents", documentId] }),
  });
}

export function useApproveLegalDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => legalDocumentsApi.approve(documentId, versionId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["legal-documents", documentId] }),
  });
}

export function usePublishLegalDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => legalDocumentsApi.publish(documentId, versionId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["legal-documents", documentId] }),
  });
}
