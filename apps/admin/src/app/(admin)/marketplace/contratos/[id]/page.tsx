"use client";

import { Button, Card, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { use } from "react";

import { ContractStatusBadge } from "@/features/marketplace/components/contract-status-badge";
import { useContract, useContractRatings } from "@/features/marketplace/hooks/use-marketplace";
import { RATING_TARGET_LABEL } from "@/features/marketplace/labels";

/**
 * Detalhe de um contrato — visão CROSS-TENANT, somente leitura, do
 * Admin Rotta. Sem ação de assinatura, exclusiva da Empresa/Gestor.
 */
export default function ContratoAdminDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const router = useRouter();
  const { data: contract, isLoading } = useContract(id);
  const { data: ratings } = useContractRatings(id);

  if (isLoading || !contract) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Typography variant="title">Contrato</Typography>
          <ContractStatusBadge status={contract.status} />
        </div>
        <Button variant="ghost" onClick={() => router.push("/marketplace/contratos")}>
          Voltar
        </Button>
      </div>

      <Card>
        <Card.Header title="Dados do contrato" />
        <Card.Body className="flex flex-col gap-2">
          <Typography variant="bodySmall" color="muted">
            Empresa (ID): <span className="font-mono">{contract.companyId}</span>
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Responsável (ID): <span className="font-mono">{contract.responsavelId}</span>
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Aluno (ID): <span className="font-mono">{contract.studentId}</span>
          </Typography>
          <Typography variant="body">
            Mensalidade: R$ {(contract.valorMensalidadeCentavos / 100).toFixed(2)}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Plano: {contract.planoDescricao}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            Vigência: {new Date(contract.vigenciaInicio).toLocaleDateString("pt-BR")}
            {contract.vigenciaFim
              ? ` até ${new Date(contract.vigenciaFim).toLocaleDateString("pt-BR")}`
              : ""}
          </Typography>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Avaliações recebidas" />
        <Card.Body className="flex flex-col gap-3">
          {!ratings || ratings.length === 0 ? (
            <Typography variant="bodySmall" color="muted">
              Nenhuma avaliação recebida ainda.
            </Typography>
          ) : (
            ratings.map((rating) => (
              <div key={rating.id} className="border-b border-border pb-2 last:border-none">
                <Typography variant="bodySmall">
                  {RATING_TARGET_LABEL[rating.alvoTipo]}: ★ {rating.nota}
                </Typography>
                {rating.comentario ? (
                  <Typography variant="bodySmall" color="muted">
                    {rating.comentario}
                  </Typography>
                ) : null}
              </div>
            ))
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
