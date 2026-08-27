"use client";

import {
  Badge,
  Button,
  Card,
  ErrorState,
  Modal,
  Spinner,
  Textarea,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type { Vehicle, VehicleAdminReviewStatus } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import { useReviewVehicle, useVehiclesList } from "@/features/vehicles/hooks/use-vehicles";
import {
  VEHICLE_ADMIN_REVIEW_STATUS_LABEL,
  VEHICLE_CATEGORY_LABEL,
} from "@/features/vehicles/labels";


const STATUS_BADGE_VARIANT: Record<VehicleAdminReviewStatus, BadgeVariant> = {
  PRE_APROVADO: "neutral",
  APROVADO: "success",
  REPROVADO: "danger",
};

/**
 * Modal de decisão do Admin Rotta sobre um veículo — Epic A. Dois blocos
 * de observação SEPARADOS (pedido explícito do usuário: um pros
 * responsáveis, um pra transportadora), nunca reaproveitados um pro
 * outro. Motivo obrigatório só ao reprovar, mesma regra de
 * `IdentityVerificationService.decideForAdmin`.
 */
function ReviewVehicleModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}): JSX.Element {
  const [observacaoResponsaveis, setObservacaoResponsaveis] = useState(
    vehicle.revisaoAdminObservacaoResponsaveis ?? "",
  );
  const [observacaoTransportadora, setObservacaoTransportadora] = useState(
    vehicle.revisaoAdminObservacaoTransportadora ?? "",
  );
  const [motivoError, setMotivoError] = useState("");
  const review = useReviewVehicle(vehicle.id);

  function handleDecide(status: "APROVADO" | "REPROVADO"): void {
    if (status === "REPROVADO" && observacaoTransportadora.trim().length === 0) {
      setMotivoError(
        "Informe o motivo da reprovação — ele é mostrado diretamente à transportadora.",
      );
      return;
    }
    setMotivoError("");
    review.mutate(
      {
        status,
        observacaoResponsaveis: observacaoResponsaveis.trim() || undefined,
        observacaoTransportadora: observacaoTransportadora.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal isOpen onClose={onClose}>
      <Modal.Header onClose={onClose}>
        Revisar {vehicle.placa} · {vehicle.modelo}
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          Esta é uma camada ADICIONAL sobre o pré-aprovado automático — o veículo continua rodando
          normalmente enquanto não for reprovado. Reprovar bloqueia o veículo de ser credenciado
          numa rota ou iniciar viagem daqui pra frente.
        </Typography>

        <div className="flex flex-col gap-1.5">
          <Typography variant="caption" className="font-semibold">
            Observação para os responsáveis
          </Typography>
          <Typography variant="caption" color="muted">
            Mostrada ao responsável como &ldquo;Li e concordo&rdquo; quando aprovado com observação,
            ou como aviso somente leitura quando reprovado.
          </Typography>
          <Textarea
            value={observacaoResponsaveis}
            onChange={(event) => setObservacaoResponsaveis(event.target.value)}
            placeholder="Ex.: veículo aprovado com pendência de vistoria a regularizar em 30 dias."
            maxLength={1000}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Typography variant="caption" className="font-semibold">
            Observação para a transportadora
          </Typography>
          <Typography variant="caption" color="muted">
            Mostrada só para a empresa/gestor — motivo obrigatório ao reprovar.
          </Typography>
          <Textarea
            value={observacaoTransportadora}
            onChange={(event) => {
              setObservacaoTransportadora(event.target.value);
              setMotivoError("");
            }}
            placeholder="Ex.: CRLV vencido — regularize e reenvie o documento."
            maxLength={1000}
            hasError={Boolean(motivoError)}
          />
          {motivoError && (
            <Typography variant="caption" color="danger">
              {motivoError}
            </Typography>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          isLoading={review.isPending}
          onClick={() => handleDecide("REPROVADO")}
        >
          Reprovar
        </Button>
        <Button
          variant="primary"
          isLoading={review.isPending}
          onClick={() => handleDecide("APROVADO")}
        >
          Aprovar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function VehicleRow({
  vehicle,
  onReview,
}: {
  vehicle: Vehicle;
  onReview: (vehicle: Vehicle) => void;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Typography variant="body" className="font-semibold">
            {vehicle.placa} · {vehicle.modelo}
            {vehicle.marca ? ` (${vehicle.marca})` : ""}
          </Typography>
          <Badge variant={STATUS_BADGE_VARIANT[vehicle.revisaoAdminStatus]}>
            {VEHICLE_ADMIN_REVIEW_STATUS_LABEL[vehicle.revisaoAdminStatus]}
          </Badge>
        </div>
        <Typography variant="caption" color="muted">
          {VEHICLE_CATEGORY_LABEL[vehicle.categoria]} · {vehicle.capacidadePassageiros} lugares
        </Typography>
      </div>
      <Button variant="secondary" size="sm" onClick={() => onReview(vehicle)}>
        Analisar
      </Button>
    </div>
  );
}

/**
 * Aba "Veículos" dentro do detalhe da Empresa (Admin Rotta) — Epic A.
 * Lista os veículos da empresa com placa/modelo/categoria/marca/capacidade
 * + badge de status; cada linha abre o modal de decisão (Aprovar/Reprovar
 * com observação dupla). Vale para toda empresa, inclusive Autônomo/MEI.
 */
export function CompanyVehiclesTab({ companyId }: { companyId: string }): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useVehiclesList({
    companyId,
    pageSize: 50,
  });
  const [reviewing, setReviewing] = useState<Vehicle | null>(null);

  return (
    <Card>
      {isLoading ? (
        <Card.Body className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </Card.Body>
      ) : isError ? (
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar os veículos desta empresa."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        </Card.Body>
      ) : data && data.items.length === 0 ? (
        <Card.Body>
          <Typography variant="body" color="muted">
            Esta empresa ainda não cadastrou veículos.
          </Typography>
        </Card.Body>
      ) : (
        <div className="divide-y divide-border">
          {data?.items.map((vehicle) => (
            <VehicleRow key={vehicle.id} vehicle={vehicle} onReview={setReviewing} />
          ))}
        </div>
      )}

      {reviewing && <ReviewVehicleModal vehicle={reviewing} onClose={() => setReviewing(null)} />}
    </Card>
  );
}
