"use client";

import { FileText, Plus } from "@rotta/icons";
import { Badge, Button, Card, FormField, Input, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import type { LegalDocumentVersionStatus } from "@rotta/api-client";

import {
  useCreateLegalDocument,
  useLegalDocuments,
} from "@/features/legal-documents/hooks/use-legal-documents";

const STATUS_LABEL: Record<LegalDocumentVersionStatus, string> = {
  RASCUNHO: "Rascunho",
  REVISAO: "Em revisão",
  APROVACAO: "Aprovada, aguardando publicação",
  PUBLICADO: "Publicada",
};

const STATUS_BADGE: Record<LegalDocumentVersionStatus, "neutral" | "info" | "warning" | "success"> =
  {
    RASCUNHO: "neutral",
    REVISAO: "info",
    APROVACAO: "warning",
    PUBLICADO: "success",
  };

/**
 * CMS de documentos legais — lista (Dossiê 45 FRENTE 4, tarefa #205).
 * Cada linha mostra a versão mais recente (`versoes[0]`, já ordenada
 * desc pelo backend) — nunca "a versão publicada", que pode ser uma
 * anterior enquanto uma nova está em RASCUNHO/REVISAO/APROVACAO.
 */
export default function DocumentosLegaisPage(): JSX.Element {
  const { data: documents, isLoading } = useLegalDocuments();
  const createDocument = useCreateLegalDocument();
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState("");
  const [titulo, setTitulo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createDocument.mutateAsync({ slug, titulo });
      setSlug("");
      setTitulo("");
      setShowForm(false);
    } catch {
      setErrorMessage("Erro ao criar documento — confira se o slug já não existe.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="title">Documentos Legais</Typography>
          <Typography variant="bodySmall" color="muted">
            CMS interno com fluxo Rascunho → Revisão → Aprovação → Publicação.
          </Typography>
        </div>
        <Button
          variant="primary"
          iconLeft={<Plus className="h-4 w-4" />}
          onClick={() => setShowForm((v) => !v)}
        >
          Novo documento
        </Button>
      </div>

      {showForm && (
        <Card>
          <Card.Header title="Novo documento" />
          <form onSubmit={(event) => void handleCreate(event)}>
            <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Slug"
                isRequired
                helperText="Mesmo slug de apps/web/src/features/legal/documents.ts"
              >
                <Input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="termos"
                />
              </FormField>
              <FormField label="Título" isRequired>
                <Input
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Termos de Uso"
                />
              </FormField>
            </Card.Body>
            <Card.Footer>
              {errorMessage && (
                <Typography variant="bodySmall" color="danger" className="mr-auto">
                  {errorMessage}
                </Typography>
              )}
              <Button type="submit" variant="primary" isLoading={createDocument.isPending}>
                Criar
              </Button>
            </Card.Footer>
          </form>
        </Card>
      )}

      {isLoading || !documents ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => {
            const latest = document.versoes[0];
            return (
              <Link key={document.id} href={`/documentos-legais/${document.id}`}>
                <Card interactive className="h-full">
                  <Card.Body className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Typography variant="subtitle">{document.titulo}</Typography>
                        <Typography variant="caption" color="muted" className="font-mono">
                          {document.slug}
                        </Typography>
                      </div>
                      <FileText className="h-5 w-5 shrink-0 text-text-muted" />
                    </div>
                    {latest ? (
                      <Badge variant={STATUS_BADGE[latest.status]}>
                        v{latest.versao} — {STATUS_LABEL[latest.status]}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Nenhuma versão criada ainda</Badge>
                    )}
                  </Card.Body>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
