"use client";

import { Badge, Card, Spinner, Typography } from "@rotta/ui/web";

import type { IdentityVerificationStatus } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import { JoinRequestRow } from "@/features/team/components/join-request-row";
import { usePendingJoinRequests } from "@/features/team/hooks/use-join-requests";
import { useMyTeam } from "@/features/team/hooks/use-team";

/** Mesmos rótulos/cores de `(dashboard)/verificacao-identidade` — a MESMA verificação, só vista de outro ângulo (o dono da empresa, não o próprio motorista). */
const STATUS_LABEL: Record<IdentityVerificationStatus, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  EXPIRADA: "Expirada",
};

const STATUS_VARIANT: Record<IdentityVerificationStatus, BadgeVariant> = {
  NAO_INICIADA: "neutral",
  EM_ANDAMENTO: "info",
  EM_ANALISE: "warning",
  APROVADA: "success",
  REPROVADA: "danger",
  EXPIRADA: "danger",
};

const PAPEL_LABEL: Record<string, string> = {
  motorista: "Motorista",
  monitor: "Monitor",
  gestor: "Gestor",
};

/**
 * Equipe (Frente K) — primeira tela onde a EMPRESA vê os próprios
 * Motoristas/Monitores/Gestores, incluindo se a Didit já aprovou ou
 * recusou a verificação de identidade de cada um. Resolve
 * concretamente a reclamação "recusei no Didit e a empresa continua
 * esperando o resultado" — antes desta tela não havia ONDE olhar isso.
 */
export default function EquipePage(): JSX.Element {
  const { data: equipe, isLoading, isError } = useMyTeam();
  const { data: pendingRequests, isLoading: isLoadingRequests } = usePendingJoinRequests();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Equipe</Typography>
        <Typography variant="bodySmall" color="muted">
          Motoristas, monitores e gestores da sua empresa — incluindo o status da verificação de
          identidade.
        </Typography>
      </div>

      {!isLoadingRequests && pendingRequests && pendingRequests.length > 0 ? (
        <Card>
          <Card.Header title="Pedidos de vínculo pendentes" />
          <Card.Body className="flex flex-col gap-1">
            <Typography variant="bodySmall" color="muted" className="pb-2">
              Motoristas/monitores que informaram o código da sua empresa e aguardam sua decisão.
            </Typography>
            <div className="flex flex-col divide-y divide-border">
              {pendingRequests.map((request) => (
                <JoinRequestRow key={request.id} request={request} />
              ))}
            </div>
          </Card.Body>
        </Card>
      ) : null}

      <Card>
        <Card.Body>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <Typography variant="body" color="danger">
              Não foi possível carregar a equipe. Tente novamente.
            </Typography>
          ) : !equipe || equipe.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhum motorista, monitor ou gestor cadastrado ainda.
            </Typography>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {equipe.map((membro) => (
                <div
                  key={membro.userId}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <Typography variant="bodySmall" className="font-semibold">
                      {membro.nome}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      {PAPEL_LABEL[membro.papel] ?? membro.papel} · {membro.email} ·{" "}
                      {membro.telefone}
                    </Typography>
                    {membro.identityVerificationStatus === "REPROVADA" &&
                      membro.identityVerificationMotivo && (
                        <Typography variant="caption" color="danger">
                          Motivo: {membro.identityVerificationMotivo}
                        </Typography>
                      )}
                  </div>
                  <Badge variant={STATUS_VARIANT[membro.identityVerificationStatus]}>
                    {STATUS_LABEL[membro.identityVerificationStatus]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
