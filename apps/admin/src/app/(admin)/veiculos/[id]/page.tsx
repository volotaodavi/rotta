"use client";

import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Select,
  Spinner,
  Table,
  Typography,
} from "@rotta/ui/web";
import { use, useState } from "react";

import type {
  VehicleAuditLog,
  VehicleOccurrence,
  VehicleOccurrenceSeverity,
  VehicleStatus,
} from "@rotta/api-client";

import { VehicleStatusBadge } from "@/features/vehicles/components/vehicle-status-badge";
import {
  useCredenciarRastreador,
  useUpdateVehicleStatus,
  useVehicle,
  useVehicleAuditLogs,
  useVehicleOccurrences,
} from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";

const STATUS_OPTIONS: VehicleStatus[] = [
  "DISPONIVEL",
  "EM_VIAGEM",
  "MANUTENCAO",
  "RESERVA",
  "INATIVO",
  "BLOQUEADO",
];

/** Mesmos rótulos/cores de `apps/web/src/app/(dashboard)/ocorrencia/page.tsx`. */
const OCORRENCIA_SEVERIDADE_LABEL: Record<VehicleOccurrenceSeverity, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};
const OCORRENCIA_SEVERIDADE_BADGE: Record<
  VehicleOccurrenceSeverity,
  "neutral" | "warning" | "danger"
> = {
  BAIXA: "neutral",
  MEDIA: "warning",
  ALTA: "danger",
};

/**
 * Detalhes de um veículo — visão de FISCALIZAÇÃO do Admin Rotta (suporte
 * multi-tenant/auditoria), não a tela de gestão operacional completa que
 * já existe em `apps/web` (aquela tem abas de Documentos/Manutenções/
 * Lembretes/Vínculos/Checklist — operação do dia a dia da própria
 * Empresa/Gestor). Aqui: dados básicos, troca de status (intervenção
 * pontual de suporte), o log de auditoria e — desde a auditoria
 * 31/08/2026 — as Ocorrências registradas pelo Motorista/Monitor
 * (LEITURA apenas: o endpoint já liberava `ADMIN_ROTTA`, mas nenhuma
 * tela do Admin consumia; registrar uma ocorrência nova continua
 * exclusivo de quem está na viagem). Sem cadastro, já que Admin Rotta
 * não tem tenant próprio.
 */
export default function VeiculoAdminDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const { data: vehicle, isLoading, isError } = useVehicle(id);
  const { data: auditLogs } = useVehicleAuditLogs(id);
  const { data: occurrences } = useVehicleOccurrences(id);
  const updateStatus = useUpdateVehicleStatus(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <Typography variant="body" color="danger">
        Não foi possível carregar este veículo.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Typography variant="title" className="font-mono">
              {vehicle.placa}
            </Typography>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <Typography variant="caption" color="muted">
            {vehicle.modelo} {vehicle.marca ? `, ${vehicle.marca}` : ""} · Empresa (ID):{" "}
            <span className="font-mono">{vehicle.companyId}</span>
          </Typography>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={vehicle.status}
            disabled={updateStatus.isPending}
            onChange={(event) => updateStatus.mutate(event.target.value as VehicleStatus)}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <Card.Header
          title="Dados do veículo"
          action={<Badge variant="neutral">{VEHICLE_CATEGORY_LABEL[vehicle.categoria]}</Badge>}
        />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoItem label="Tipo" value={VEHICLE_TYPE_LABEL[vehicle.tipo]} />
          <InfoItem label="Ano" value={vehicle.ano?.toString() ?? "Não informado"} />
          <InfoItem label="Cor" value={vehicle.cor ?? "Não informado"} />
          <InfoItem label="RENAVAM" value={vehicle.renavam ?? "Não informado"} />
          <InfoItem label="Chassi" value={vehicle.chassi ?? "Não informado"} />
          <InfoItem
            label="Capacidade de passageiros"
            value={vehicle.capacidadePassageiros.toString()}
          />
          <InfoItem
            label="Quilometragem atual"
            value={`${vehicle.quilometragemAtual.toLocaleString("pt-BR")} km`}
          />
          <InfoItem
            label="Último motorista (ID)"
            value={vehicle.ultimoMotoristaId ?? "Não informado"}
          />
          <InfoItem
            label="Último monitor (ID)"
            value={vehicle.ultimoMonitorId ?? "Não informado"}
          />
          <InfoItem
            label="Última posição"
            value={
              vehicle.ultimaLatitude && vehicle.ultimaLongitude
                ? `${vehicle.ultimaLatitude}, ${vehicle.ultimaLongitude}`
                : "Não informado"
            }
          />
          <InfoItem
            label="Atualizado em"
            value={
              vehicle.ultimaPosicaoEm
                ? new Date(vehicle.ultimaPosicaoEm).toLocaleString("pt-BR")
                : "Nunca atualizada"
            }
          />
          <InfoItem label="Observações" value={vehicle.observacoes ?? "Não informado"} />
        </Card.Body>
      </Card>

      <CredenciamentoDoRastreador
        vehicleId={vehicle.id}
        imeiAtual={vehicle.rastreadorImei}
        vinculadoEm={vehicle.rastreadorVinculadoEm}
      />

      <Card>
        <Card.Header title="Auditoria" />
        <Card.Body>
          <Table<VehicleAuditLog>
            columns={[
              {
                key: "acao",
                header: "Ação",
                render: (log) => log.acao,
              },
              {
                key: "ator",
                header: "Autor (ID)",
                render: (log) => (
                  <span className="font-mono text-xs">{log.atorUserId ?? "Não informado"}</span>
                ),
              },
              {
                key: "data",
                header: "Data",
                render: (log) => new Date(log.createdAt).toLocaleString("pt-BR"),
              },
            ]}
            rows={auditLogs?.items ?? []}
            keyExtractor={(log) => log.id}
            emptyMessage="Nenhum registro de auditoria para este veículo."
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Ocorrências" />
        <Card.Body>
          <Table<VehicleOccurrence>
            columns={[
              {
                key: "severidade",
                header: "Severidade",
                render: (occurrence) => (
                  <Badge variant={OCORRENCIA_SEVERIDADE_BADGE[occurrence.severidade]}>
                    {OCORRENCIA_SEVERIDADE_LABEL[occurrence.severidade]}
                  </Badge>
                ),
              },
              {
                key: "titulo",
                header: "Título",
                render: (occurrence) => occurrence.titulo,
              },
              {
                key: "descricao",
                header: "Descrição",
                render: (occurrence) => (
                  <span className="line-clamp-2 max-w-xs">{occurrence.descricao}</span>
                ),
              },
              {
                key: "reportadoPor",
                header: "Reportado por (ID)",
                render: (occurrence) => (
                  <span className="font-mono text-xs">{occurrence.reportadoPorId}</span>
                ),
              },
              {
                key: "data",
                header: "Data",
                render: (occurrence) => new Date(occurrence.createdAt).toLocaleString("pt-BR"),
              },
            ]}
            rows={occurrences?.items ?? []}
            keyExtractor={(occurrence) => occurrence.id}
            emptyMessage="Nenhuma ocorrência registrada para este veículo."
          />
        </Card.Body>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="body">{value}</Typography>
    </div>
  );
}

/**
 * Credenciamento inicial do rastreador (pedido do usuário 22/09/2026,
 * fluxo público: "o credenciamento inicial — configuração do rastreador
 * — deverá partir daqui + admin. Aí depois do credenciamento inicial
 * ser finalizado, o resto ficará com o despachante").
 *
 * Esta é a única etapa do rastreador que passa pela Rotta. Depois dela,
 * quem opera é o despachante da transportadora: põe ônibus na rota,
 * troca motorista, troca carro. Nada disso volta para cá.
 *
 * O cuidado da tela é um só: errar o IMEI significa mostrar um ônibus
 * no lugar de outro para as famílias. Por isso o campo fica sempre
 * visível com o valor atual — nunca um formulário vazio que esconde o
 * que já está credenciado — e desvincular é uma ação separada do botão
 * de salvar.
 */
function CredenciamentoDoRastreador({
  vehicleId,
  imeiAtual,
  vinculadoEm,
}: {
  vehicleId: string;
  imeiAtual: string | null;
  vinculadoEm: string | null;
}): JSX.Element {
  const credenciar = useCredenciarRastreador(vehicleId);
  const [imei, setImei] = useState(imeiAtual ?? "");

  return (
    <Card>
      <Card.Header title="Rastreador" />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          Amarra o aparelho a este ônibus. A partir daqui, toda posição que chegar com este IMEI
          aparece como sendo deste carro — inclusive no app dos responsáveis.
        </Typography>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField
            label="IMEI do rastreador"
            helperText={
              vinculadoEm
                ? `Credenciado em ${new Date(vinculadoEm).toLocaleString("pt-BR")}.`
                : "Só dígitos, 14 a 17 caracteres. Está na etiqueta do aparelho."
            }
          >
            <Input
              value={imei}
              onChange={(event) => setImei(event.target.value.replace(/\D/g, ""))}
              placeholder="863719060123456"
              inputMode="numeric"
            />
          </FormField>
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={!imei || imei === imeiAtual || credenciar.isPending}
              onClick={() => credenciar.mutate(imei)}
            >
              {credenciar.isPending ? "Salvando…" : "Credenciar"}
            </Button>
            {imeiAtual ? (
              <Button
                variant="secondary"
                disabled={credenciar.isPending}
                onClick={() => {
                  setImei("");
                  credenciar.mutate(undefined);
                }}
              >
                Desvincular
              </Button>
            ) : null}
          </div>
        </div>

        {!imeiAtual ? (
          <Typography variant="caption" color="muted">
            Sem rastreador credenciado. Este ônibus só aparece no mapa se alguém rodar a viagem pelo
            aplicativo.
          </Typography>
        ) : null}
      </Card.Body>
    </Card>
  );
}
