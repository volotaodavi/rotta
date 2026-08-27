"use client";

import { Button, Modal, Typography } from "@rotta/ui/web";

import {
  useAcknowledgeVehicleAdminReview,
  usePendingVehicleAdminReviewAcknowledgements,
} from "@/features/vehicles/hooks/use-vehicles";

/**
 * "Li e concordo" (Epic A, Responsável) — mostra, um de cada vez, o
 * veículo aprovado com observação ainda não reconhecido pelo
 * responsável logado. Nunca bloqueia o uso do app: some quando não há
 * pendência e reaparece na próxima vez que houver uma nova decisão do
 * Admin Rotta. De propósito só existe UM botão — nunca "recusar"
 * (pedido explícito do usuário).
 */
export function VehicleAdminReviewAcknowledgeModal(): JSX.Element | null {
  const { data } = usePendingVehicleAdminReviewAcknowledgements();
  const pending = data?.[0];
  const acknowledge = useAcknowledgeVehicleAdminReview(pending?.vehicleId ?? "");

  if (!pending) return null;

  return (
    <Modal isOpen onClose={() => undefined}>
      <Modal.Header>Aviso sobre o veículo {pending.placa}</Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        <Typography variant="bodySmall" color="muted">
          A Rotta do Brasil analisou este veículo e tem uma observação para você.
        </Typography>
        <Typography variant="body">{pending.observacao}</Typography>
      </Modal.Body>
      <Modal.Footer>
        <Button isLoading={acknowledge.isPending} onClick={() => acknowledge.mutate()}>
          Li e concordo
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
