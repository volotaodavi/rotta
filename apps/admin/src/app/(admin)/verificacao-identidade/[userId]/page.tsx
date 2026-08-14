"use client";

import { Button, Card, Modal, Spinner, Typography } from "@rotta/ui/web";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { DiditEvidenceCard } from "@/features/identity-verification/components/didit-evidence-card";
import { IdentityVerificationStatusBadge } from "@/features/identity-verification/components/identity-verification-status-badge";
import { parseDiditDecision } from "@/features/identity-verification/didit-decision.types";
import {
  useDecideIdentityVerification,
  useIdentityVerification,
  useRefreshIdentityVerification,
} from "@/features/identity-verification/hooks/use-identity-verification-admin";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

/**
 * Detalhe de uma verificação de identidade (Admin Rotta) — o que
 * fecha o gap relatado ("recusei no Didit e não apareceu na Rotta"):
 * "Sincronizar com a Didit" puxa `GET /v3/session/{id}/decision/` na
 * hora, sem depender do webhook ter chegado. "Aprovar"/"Recusar"
 * decide manualmente direto por aqui (`PATCH .../update-status/`),
 * sem precisar abrir o Business Console da Didit.
 */
export default function VerificacaoIdentidadeDetailPage(): JSX.Element {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;

  const { data, isLoading, isError } = useIdentityVerification(userId);
  const refresh = useRefreshIdentityVerification(userId);
  const decide = useDecideIdentityVerification(userId);

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [declineError, setDeclineError] = useState("");

  function handleApprove(): void {
    decide.mutate({ newStatus: "Approved" });
  }

  function handleConfirmDecline(): void {
    if (!comment.trim()) {
      setDeclineError("Informe o motivo — ele é mostrado direto para o usuário.");
      return;
    }
    decide.mutate(
      { newStatus: "Declined", comment: comment.trim() },
      { onSuccess: () => setDeclineModalOpen(false) },
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <Card.Body>
          <Typography variant="body" color="danger">
            Não foi possível carregar esta verificação de identidade.
          </Typography>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/verificacao-identidade")}>
            ← Voltar
          </Button>
          <Typography variant="title">{data.nome}</Typography>
          <Typography variant="bodySmall" color="muted">
            {data.email}
            {data.companyName ? ` · ${data.companyName}` : ""}
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            isLoading={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            Sincronizar com a Didit
          </Button>
          {data.status !== "APROVADA" && (
            <Button
              variant="primary"
              isLoading={decide.isPending && decide.variables?.newStatus === "Approved"}
              onClick={handleApprove}
            >
              Aprovar
            </Button>
          )}
          {data.status !== "REPROVADA" && (
            <Button
              variant="danger"
              onClick={() => {
                setComment("");
                setDeclineError("");
                setDeclineModalOpen(true);
              }}
            >
              Recusar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Card.Header title="Status" />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Typography variant="caption" color="muted">
              Status atual
            </Typography>
            <IdentityVerificationStatusBadge status={data.status} />
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="caption" color="muted">
              Verificado em
            </Typography>
            <Typography variant="body">{formatDate(data.verifiedAt)}</Typography>
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="caption" color="muted">
              Última atualização
            </Typography>
            <Typography variant="body">{formatDate(data.updatedAt)}</Typography>
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="caption" color="muted">
              Sessão Didit
            </Typography>
            <Typography variant="body" className="break-all font-mono text-xs">
              {data.sessionId ?? "—"}
            </Typography>
          </div>
          {data.motivo && (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Typography variant="caption" color="muted">
                Motivo
              </Typography>
              <Typography variant="body" color={data.status === "REPROVADA" ? "danger" : undefined}>
                {data.motivo}
              </Typography>
            </div>
          )}
        </Card.Body>
      </Card>

      {(() => {
        const decisao = parseDiditDecision(data.decisao);
        return decisao ? <DiditEvidenceCard decisao={decisao} /> : null;
      })()}

      <Card>
        <Card.Header title="Payload bruto da última decisão (Didit)" />
        <Card.Body>
          {data.decisao ? (
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(data.decisao, null, 2)}
            </pre>
          ) : (
            <Typography variant="body" color="muted">
              Nenhuma decisão recebida ainda — a sessão pode estar em andamento, ou o usuário nunca
              chegou a submeter os documentos.
            </Typography>
          )}
        </Card.Body>
      </Card>

      <Modal isOpen={declineModalOpen} onClose={() => setDeclineModalOpen(false)}>
        <Modal.Header onClose={() => setDeclineModalOpen(false)}>
          Recusar verificação de identidade
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-3">
          <Typography variant="bodySmall" color="muted">
            Este motivo é mostrado diretamente para {data.nome} na tela de bloqueio — seja
            específico o bastante para que a pessoa saiba o que corrigir na próxima tentativa.
          </Typography>
          <textarea
            rows={4}
            placeholder="Ex.: A foto do documento está ilegível — reenvie com boa iluminação."
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setDeclineError("");
            }}
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          {declineError && (
            <Typography variant="caption" color="danger">
              {declineError}
            </Typography>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setDeclineModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" isLoading={decide.isPending} onClick={handleConfirmDecline}>
            Recusar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
