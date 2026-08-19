"use client";

import { ApiError } from "@rotta/api-client";
import { Plus } from "@rotta/icons";
import { Badge, Button, Card, ErrorState, FormField, Spinner, Typography } from "@rotta/ui/web";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { LegalDocumentVersion, LegalDocumentVersionStatus } from "@rotta/api-client";

import {
  useApproveLegalDocumentVersion,
  useCreateLegalDocumentVersion,
  useLegalDocument,
  usePublishLegalDocumentVersion,
  useSubmitLegalDocumentVersionForReview,
  useUpdateLegalDocumentVersion,
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
 * Detalhe de um documento — histórico completo de versões (nunca
 * apagado) + editor da versão mais recente enquanto RASCUNHO + botões
 * de transição (`submitForReview`/`approve`/`publish`), cada um só
 * habilitado no estado em que o backend de fato aceita a chamada —
 * `LegalDocumentsService` é a fonte de verdade da regra, isto aqui só
 * evita o clique óbvio que já sabemos que vai voltar erro.
 */
export default function DocumentoLegalDetalhePage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const { data: document, isLoading, isError, refetch, isFetching } = useLegalDocument(documentId);

  const createVersion = useCreateLegalDocumentVersion(documentId);
  const updateVersion = useUpdateLegalDocumentVersion(documentId);
  const submitForReview = useSubmitLegalDocumentVersionForReview(documentId);
  const approve = useApproveLegalDocumentVersion(documentId);
  const publish = usePublishLegalDocumentVersion(documentId);

  const [conteudo, setConteudo] = useState("");
  const [changelog, setChangelog] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const latest = document?.versoes[0];

  useEffect(() => {
    if (latest?.status === "RASCUNHO") {
      setConteudo(latest.conteudoMarkdown);
      setChangelog(latest.changelog ?? "");
    }
  }, [latest]);

  async function runAction(action: () => Promise<unknown>): Promise<void> {
    setErrorMessage(null);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  /** Achado real (auditoria "tá dando erro"): sem isso, uma falha na busca deixava a tela presa num spinner infinito, sem erro visível nem botão de tentar de novo. */
  if (isError || !document) {
    return (
      <ErrorState
        message="Não foi possível carregar este documento."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Typography variant="title">{document.titulo}</Typography>
        <Typography variant="caption" color="muted" className="font-mono">
          {document.slug}
        </Typography>
      </div>

      {errorMessage && (
        <Card className="border-danger/30">
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              {errorMessage}
            </Typography>
          </Card.Body>
        </Card>
      )}

      {!latest || latest.status === "PUBLICADO" ? (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3 py-8 text-center">
            <Typography variant="bodySmall" color="muted">
              {latest
                ? "A versão mais recente já foi publicada. Crie uma nova versão para propor uma mudança."
                : "Nenhuma versão criada ainda."}
            </Typography>
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              isLoading={createVersion.isPending}
              onClick={() =>
                void runAction(() => createVersion.mutateAsync({ conteudoMarkdown: "" }))
              }
            >
              Criar nova versão
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Header
            title={`Versão ${latest.versao}`}
            action={
              <Badge variant={STATUS_BADGE[latest.status]}>{STATUS_LABEL[latest.status]}</Badge>
            }
          />
          <Card.Body className="flex flex-col gap-4">
            <FormField label="Conteúdo (Markdown)">
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                disabled={latest.status !== "RASCUNHO"}
                rows={14}
                className="w-full rounded-md border border-border bg-surface px-4 py-2.5 font-mono text-sm text-text outline-none transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </FormField>
            <FormField
              label="Changelog"
              helperText="O que mudou nesta versão — obrigatório para enviar para revisão."
            >
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                disabled={latest.status !== "RASCUNHO"}
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </FormField>
          </Card.Body>
          <Card.Footer>
            {latest.status === "RASCUNHO" && (
              <>
                <Button
                  variant="secondary"
                  isLoading={updateVersion.isPending}
                  onClick={() =>
                    void runAction(() =>
                      updateVersion.mutateAsync({
                        versionId: latest.id,
                        input: { conteudoMarkdown: conteudo, changelog },
                      }),
                    )
                  }
                >
                  Salvar rascunho
                </Button>
                <Button
                  variant="primary"
                  isLoading={submitForReview.isPending}
                  onClick={() =>
                    void runAction(async () => {
                      await updateVersion.mutateAsync({
                        versionId: latest.id,
                        input: { conteudoMarkdown: conteudo, changelog },
                      });
                      await submitForReview.mutateAsync(latest.id);
                    })
                  }
                >
                  Enviar para revisão
                </Button>
              </>
            )}
            {latest.status === "REVISAO" && (
              <Button
                variant="primary"
                isLoading={approve.isPending}
                onClick={() => void runAction(() => approve.mutateAsync(latest.id))}
              >
                Aprovar
              </Button>
            )}
            {latest.status === "APROVACAO" && (
              <Button
                variant="primary"
                isLoading={publish.isPending}
                onClick={() => void runAction(() => publish.mutateAsync(latest.id))}
              >
                Publicar
              </Button>
            )}
          </Card.Footer>
        </Card>
      )}

      {document.versoes.length > 1 && (
        <Card>
          <Card.Header title="Histórico de versões" />
          <Card.Body className="flex flex-col divide-y divide-border">
            {document.versoes.map((version: LegalDocumentVersion) => (
              <div key={version.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Typography variant="bodySmall">Versão {version.versao}</Typography>
                  {version.changelog && (
                    <Typography variant="caption" color="muted">
                      {version.changelog}
                    </Typography>
                  )}
                </div>
                <Badge variant={STATUS_BADGE[version.status]}>{STATUS_LABEL[version.status]}</Badge>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
