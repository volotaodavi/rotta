"use client";

import { ApiError } from "@rotta/api-client";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Select,
  Spinner,
  Table,
  Tabs,
  Typography,
} from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type {
  UpdateVehicleInput,
  VehicleAssignmentRole,
  VehicleDocumentType,
  VehicleMaintenanceType,
  VehicleReminderType,
  VehicleStatus,
} from "@rotta/api-client";

import { VehicleCategoryReviewBadges } from "@/features/vehicles/components/vehicle-category-review-badges";
import { VehicleDocumentAiStatusBadge } from "@/features/vehicles/components/vehicle-document-ai-status-badge";
import { VehicleStatusBadge } from "@/features/vehicles/components/vehicle-status-badge";
import {
  useAssignVehicle,
  useCreateVehicleMaintenance,
  useCreateVehicleOccurrence,
  useCreateVehicleReminder,
  useDeleteVehicle,
  useRemoveVehicleDocument,
  useUpdateVehicle,
  useUpdateVehicleReminderStatus,
  useUpdateVehicleStatus,
  useUploadVehicleDocument,
  useUploadVehiclePhoto,
  useVehicle,
  useVehicleAssignmentHistory,
  useVehicleAuditLogs,
  useVehicleChecklists,
  useVehicleDocuments,
  useVehicleMaintenances,
  useVehicleOccurrences,
  useVehicleReminders,
} from "@/features/vehicles/hooks/use-vehicles";
import {
  VEHICLE_CATEGORY_LABEL,
  VEHICLE_DOCUMENT_TYPE_LABEL,
  VEHICLE_MAINTENANCE_TYPE_LABEL,
  VEHICLE_REMINDER_TYPE_LABEL,
  VEHICLE_TYPE_LABEL,
} from "@/features/vehicles/labels";


const TABS = [
  { id: "dados", label: "Dados" },
  { id: "documentos", label: "Documentos" },
  { id: "manutencoes", label: "Manutenção" },
  { id: "lembretes", label: "Lembretes" },
  { id: "vinculos", label: "Vínculos" },
  { id: "checklist", label: "Checklist" },
  { id: "ocorrencias", label: "Ocorrências" },
  { id: "auditoria", label: "Histórico" },
];

/**
 * Detalhe do Veículo — Dados/Documentos/Manutenção/Lembretes/Vínculos/
 * Checklist/Ocorrências/Histórico em uma única página com abas (mesma
 * decisão de `Tabs` documentada no componente): tudo pertence ao mesmo
 * veículo, navegação profunda por sub-recurso não agrega nada aqui.
 *
 * `vehicleId` chega como `string` já resolvida — `page.tsx` (Server
 * Component) faz `await params` e repassa por prop. Antes, este mesmo
 * componente era `page.tsx` diretamente, declarava `params:
 * Promise<{ id: string }>` e chamava `use(params)` dentro de um Client
 * Component — descartado como causa provável de um incidente real de
 * "Server Components render" indeterminístico em toda rota dinâmica do
 * App Router (nunca reproduzido em rota estática): `use()` de uma
 * Promise recebida via prop de um Client Component não é o contrato
 * suportado pelo Next.js App Router (Next 15.5.22 + React 18.3.1).
 */
export function VehicleDetailClient({ vehicleId }: { vehicleId: string }): JSX.Element {
  const router = useRouter();
  const { data: vehicle, isLoading, isError, refetch, isFetching } = useVehicle(vehicleId);
  const [activeTab, setActiveTab] = useState("dados");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  /** Achado real (auditoria "tá dando erro"): sem isso, uma falha na busca deixava a tela presa num spinner infinito, sem erro visível nem botão de tentar de novo. */
  if (isError || !vehicle) {
    return (
      <ErrorState
        message="Não foi possível carregar este veículo."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Typography variant="title">{vehicle.placa}</Typography>
          <VehicleStatusBadge status={vehicle.status} />
        </div>
        <Button variant="ghost" onClick={() => router.push("/veiculos")}>
          Voltar
        </Button>
      </div>

      <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === "dados" && <DadosTab vehicleId={vehicleId} />}
      {activeTab === "documentos" && <DocumentosTab vehicleId={vehicleId} />}
      {activeTab === "manutencoes" && <ManutencoesTab vehicleId={vehicleId} />}
      {activeTab === "lembretes" && <LembretesTab vehicleId={vehicleId} />}
      {activeTab === "vinculos" && <VinculosTab vehicleId={vehicleId} />}
      {activeTab === "checklist" && <ChecklistTab vehicleId={vehicleId} />}
      {activeTab === "ocorrencias" && <OcorrenciasTab vehicleId={vehicleId} />}
      {activeTab === "auditoria" && <AuditoriaTab vehicleId={vehicleId} />}
    </div>
  );
}

function DadosTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const router = useRouter();
  const { data: vehicle } = useVehicle(vehicleId);
  const updateVehicle = useUpdateVehicle(vehicleId);
  const updateStatus = useUpdateVehicleStatus(vehicleId);
  const uploadPhoto = useUploadVehiclePhoto(vehicleId);
  const deleteVehicle = useDeleteVehicle();

  const [form, setForm] = useState<UpdateVehicleInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle && !form) {
      setForm({
        modelo: vehicle.modelo,
        marca: vehicle.marca ?? "",
        ano: vehicle.ano ?? undefined,
        cor: vehicle.cor ?? "",
        capacidadePassageiros: vehicle.capacidadePassageiros,
        tipo: vehicle.tipo,
        categoria: vehicle.categoria,
        observacoes: vehicle.observacoes ?? "",
      });
    }
  }, [vehicle, form]);

  if (!vehicle || !form) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  function updateField<K extends keyof UpdateVehicleInput>(
    key: K,
    value: UpdateVehicleInput[K],
  ): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form) return;
    setErrorMessage(null);
    try {
      await updateVehicle.mutateAsync(form);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao salvar.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header
            title="Dados do veículo"
            action={
              <div className="flex items-center gap-2">
                <Typography variant="caption" color="muted">
                  Placa (não editável): {vehicle.placa}
                </Typography>
              </div>
            }
          />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Modelo" isRequired>
              <Input
                required
                value={form.modelo}
                onChange={(event) => updateField("modelo", event.target.value)}
              />
            </FormField>
            <FormField label="Marca">
              <Input
                value={form.marca ?? ""}
                onChange={(event) => updateField("marca", event.target.value)}
              />
            </FormField>
            <FormField label="Ano">
              <Input
                type="number"
                value={form.ano ?? ""}
                onChange={(event) =>
                  updateField("ano", event.target.value ? Number(event.target.value) : undefined)
                }
              />
            </FormField>
            <FormField label="Cor">
              <Input
                value={form.cor ?? ""}
                onChange={(event) => updateField("cor", event.target.value)}
              />
            </FormField>
            <FormField label="Tipo">
              <Select
                value={form.tipo}
                onChange={(event) =>
                  updateField("tipo", event.target.value as UpdateVehicleInput["tipo"])
                }
              >
                {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Categoria">
              <div className="flex flex-col gap-2">
                <Select
                  value={form.categoria}
                  onChange={(event) =>
                    updateField("categoria", event.target.value as UpdateVehicleInput["categoria"])
                  }
                >
                  {Object.entries(VEHICLE_CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <VehicleCategoryReviewBadges vehicle={vehicle} />
              </div>
            </FormField>
            <FormField label="Capacidade de passageiros" isRequired>
              <Input
                type="number"
                required
                value={form.capacidadePassageiros}
                onChange={(event) =>
                  updateField("capacidadePassageiros", Number(event.target.value))
                }
              />
            </FormField>
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="primary" isLoading={updateVehicle.isPending}>
              Salvar alterações
            </Button>
          </Card.Footer>
        </Card>
      </form>

      <Card>
        <Card.Header title="Status e foto" />
        <Card.Body className="flex flex-col gap-4">
          <FormField label="Status">
            <Select
              value={vehicle.status}
              onChange={(event) => updateStatus.mutate(event.target.value as VehicleStatus)}
            >
              {(
                [
                  "DISPONIVEL",
                  "EM_VIAGEM",
                  "MANUTENCAO",
                  "RESERVA",
                  "INATIVO",
                  "BLOQUEADO",
                ] as VehicleStatus[]
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormField>
          <FileField label="Foto do veículo">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadPhoto.mutate(file);
              }}
            />
          </FileField>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Excluir veículo" />
        <Card.Body>
          <Typography variant="bodySmall" color="muted">
            O veículo é removido das listagens, mas o histórico é sempre preservado.
          </Typography>
        </Card.Body>
        <Card.Footer>
          <Button
            variant="danger"
            isLoading={deleteVehicle.isPending}
            onClick={() => {
              deleteVehicle.mutate(vehicleId, { onSuccess: () => router.replace("/veiculos") });
            }}
          >
            Excluir
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

function DocumentosTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data: documents } = useVehicleDocuments(vehicleId);
  const uploadDocument = useUploadVehicleDocument(vehicleId);
  const removeDocument = useRemoveVehicleDocument(vehicleId);
  const [tipo, setTipo] = useState<VehicleDocumentType>("CRLV");
  const [vencimentoEm, setVencimentoEm] = useState("");

  function enviar(file: File | undefined): void {
    if (!file) return;
    uploadDocument.mutate({ meta: { tipo, vencimentoEm: vencimentoEm || undefined }, file });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Novo documento" />
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            CRLV (ou CRLV-e), Seguro, Licenciamento, Vistoria — anexe uma foto, o PDF do documento
            ou tire a foto na hora. A IA da Rotta confere se a imagem está legível e se os campos
            esperados (placa, RENAVAM) aparecem — nunca é uma aprovação de autenticidade.
          </Typography>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Tipo">
              <Select
                value={tipo}
                onChange={(event) => setTipo(event.target.value as VehicleDocumentType)}
              >
                {Object.entries(VEHICLE_DOCUMENT_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Vencimento"
              helperText="Opcional — CRLV, Seguro, Licenciamento, Vistoria"
            >
              <Input
                type="date"
                value={vencimentoEm}
                onChange={(event) => setVencimentoEm(event.target.value)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* `capture="environment"` abre a câmera direto (traseira, em
                celular) em vez do seletor de galeria/arquivos — a opção
                "tirado foto" pedida separadamente da anexação genérica. */}
            <FileField label="Tirar foto agora">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => enviar(event.target.files?.[0])}
              />
            </FileField>
            <FileField label="Anexar arquivo (foto da galeria ou PDF)">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) => enviar(event.target.files?.[0])}
              />
            </FileField>
          </div>
        </Card.Body>
      </Card>

      <Table
        columns={[
          { key: "tipo", header: "Tipo", render: (doc) => VEHICLE_DOCUMENT_TYPE_LABEL[doc.tipo] },
          { key: "nome", header: "Arquivo", render: (doc) => doc.nomeOriginal },
          {
            key: "vencimento",
            header: "Vencimento",
            render: (doc) =>
              doc.vencimentoEm
                ? new Date(doc.vencimentoEm).toLocaleDateString("pt-BR")
                : "Sem vencimento",
          },
          {
            key: "ia",
            header: "Análise Rotta AI",
            render: (doc) => (
              <div className="flex flex-col gap-1">
                <VehicleDocumentAiStatusBadge status={doc.rottaAiStatus} />
                {doc.rottaAiObservacoes && (
                  <Typography variant="caption" color="muted">
                    {doc.rottaAiObservacoes}
                  </Typography>
                )}
              </div>
            ),
          },
          {
            key: "acoes",
            header: "",
            render: (doc) => (
              <Button variant="ghost" size="sm" onClick={() => removeDocument.mutate(doc.id)}>
                Remover
              </Button>
            ),
          },
        ]}
        rows={documents ?? []}
        keyExtractor={(doc) => doc.id}
      />
    </div>
  );
}

function ManutencoesTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data } = useVehicleMaintenances(vehicleId);
  const createMaintenance = useCreateVehicleMaintenance(vehicleId);
  const [tipo, setTipo] = useState<VehicleMaintenanceType>("TROCA_OLEO");
  const [dataManutencao, setDataManutencao] = useState("");
  const [quilometragem, setQuilometragem] = useState("");
  const [fornecedor, setFornecedor] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Registrar manutenção" />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <FormField label="Tipo">
            <Select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as VehicleMaintenanceType)}
            >
              {Object.entries(VEHICLE_MAINTENANCE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data" isRequired>
            <Input
              type="date"
              required
              value={dataManutencao}
              onChange={(event) => setDataManutencao(event.target.value)}
            />
          </FormField>
          <FormField label="Quilometragem">
            <Input
              type="number"
              value={quilometragem}
              onChange={(event) => setQuilometragem(event.target.value)}
            />
          </FormField>
          <FormField label="Fornecedor">
            <Input value={fornecedor} onChange={(event) => setFornecedor(event.target.value)} />
          </FormField>
        </Card.Body>
        <Card.Footer>
          <Button
            variant="primary"
            isLoading={createMaintenance.isPending}
            onClick={() => {
              if (!dataManutencao) return;
              createMaintenance.mutate({
                tipo,
                data: dataManutencao,
                quilometragem: quilometragem ? Number(quilometragem) : undefined,
                fornecedor: fornecedor || undefined,
              });
            }}
          >
            Registrar
          </Button>
        </Card.Footer>
      </Card>

      <Table
        columns={[
          { key: "tipo", header: "Tipo", render: (m) => VEHICLE_MAINTENANCE_TYPE_LABEL[m.tipo] },
          {
            key: "data",
            header: "Data",
            render: (m) => new Date(m.data).toLocaleDateString("pt-BR"),
          },
          { key: "km", header: "Km", render: (m) => m.quilometragem ?? "Não informado" },
          {
            key: "fornecedor",
            header: "Fornecedor",
            render: (m) => m.fornecedor ?? "Não informado",
          },
        ]}
        rows={data?.items ?? []}
        keyExtractor={(m) => m.id}
      />
    </div>
  );
}

function LembretesTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data: reminders } = useVehicleReminders(vehicleId);
  const createReminder = useCreateVehicleReminder(vehicleId);
  const updateStatus = useUpdateVehicleReminderStatus(vehicleId);
  const [tipo, setTipo] = useState<VehicleReminderType>("REVISAO");
  const [dataAlvo, setDataAlvo] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Novo lembrete" />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Tipo">
            <Select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as VehicleReminderType)}
            >
              {Object.entries(VEHICLE_REMINDER_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data-alvo" isRequired>
            <Input
              type="date"
              required
              value={dataAlvo}
              onChange={(event) => setDataAlvo(event.target.value)}
            />
          </FormField>
        </Card.Body>
        <Card.Footer>
          <Button
            variant="primary"
            isLoading={createReminder.isPending}
            onClick={() => {
              if (!dataAlvo) return;
              createReminder.mutate({ tipo, dataAlvo });
            }}
          >
            Criar lembrete
          </Button>
        </Card.Footer>
      </Card>

      <Table
        columns={[
          { key: "tipo", header: "Tipo", render: (r) => VEHICLE_REMINDER_TYPE_LABEL[r.tipo] },
          {
            key: "data",
            header: "Data-alvo",
            render: (r) => new Date(r.dataAlvo).toLocaleDateString("pt-BR"),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => (r.vencido ? "Vencido" : r.vencendo ? "Vencendo" : r.status),
          },
          {
            key: "acoes",
            header: "",
            render: (r) =>
              r.status === "PENDENTE" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateStatus.mutate({ reminderId: r.id, status: "CONCLUIDO" })}
                >
                  Concluir
                </Button>
              ) : null,
          },
        ]}
        rows={reminders ?? []}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}

function VinculosTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data: history } = useVehicleAssignmentHistory(vehicleId);
  const assign = useAssignVehicle(vehicleId);
  const [papel, setPapel] = useState<VehicleAssignmentRole>("MOTORISTA");
  const [userId, setUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Vincular motorista/monitor" />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Papel">
            <Select
              value={papel}
              onChange={(event) => setPapel(event.target.value as VehicleAssignmentRole)}
            >
              <option value="MOTORISTA">Motorista</option>
              <option value="MONITOR">Monitor</option>
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              label="ID do usuário"
              helperText="Precisa já ter vínculo ativo do papel escolhido nesta empresa."
            >
              <Input value={userId} onChange={(event) => setUserId(event.target.value)} />
            </FormField>
          </div>
        </Card.Body>
        <Card.Footer>
          {errorMessage && (
            <Typography variant="bodySmall" color="danger" className="mr-auto">
              {errorMessage}
            </Typography>
          )}
          <Button
            variant="primary"
            isLoading={assign.isPending}
            onClick={() => {
              setErrorMessage(null);
              assign.mutate(
                { papel, userId },
                {
                  onError: (error) =>
                    setErrorMessage(
                      error instanceof ApiError ? error.message : "Erro ao vincular.",
                    ),
                },
              );
            }}
          >
            Vincular
          </Button>
        </Card.Footer>
      </Card>

      <Table
        columns={[
          { key: "papel", header: "Papel", render: (a) => a.papel },
          { key: "userId", header: "Usuário", render: (a) => a.userId },
          {
            key: "inicio",
            header: "Início",
            render: (a) => new Date(a.iniciadoEm).toLocaleDateString("pt-BR"),
          },
          {
            key: "fim",
            header: "Fim",
            render: (a) =>
              a.encerradoEm ? new Date(a.encerradoEm).toLocaleDateString("pt-BR") : "Atual",
          },
        ]}
        rows={history ?? []}
        keyExtractor={(a) => a.id}
      />
    </div>
  );
}

function ChecklistTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data } = useVehicleChecklists(vehicleId);

  return (
    <Table
      columns={[
        {
          key: "data",
          header: "Data",
          render: (c) => new Date(c.createdAt).toLocaleString("pt-BR"),
        },
        { key: "pneus", header: "Pneus", render: (c) => (c.pneusOk ? "OK" : "Problema") },
        { key: "luzes", header: "Luzes", render: (c) => (c.lucesOk ? "OK" : "Problema") },
        {
          key: "combustivel",
          header: "Combustível",
          render: (c) => (c.combustivelOk ? "OK" : "Problema"),
        },
        { key: "limpeza", header: "Limpeza", render: (c) => (c.limpezaOk ? "OK" : "Problema") },
        {
          key: "equipamentos",
          header: "Equipamentos",
          render: (c) => (c.equipamentosObrigatoriosOk ? "OK" : "Problema"),
        },
        {
          key: "observacoes",
          header: "Observações",
          render: (c) => c.observacoes ?? "Não informado",
        },
      ]}
      rows={data?.items ?? []}
      keyExtractor={(c) => c.id}
      emptyMessage="Nenhum checklist registrado pelo motorista ainda."
    />
  );
}

function OcorrenciasTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data } = useVehicleOccurrences(vehicleId);
  const createOccurrence = useCreateVehicleOccurrence(vehicleId);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Reportar ocorrência" />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Título" isRequired>
            <Input required value={titulo} onChange={(event) => setTitulo(event.target.value)} />
          </FormField>
          <FormField label="Descrição" isRequired>
            <Input
              required
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </FormField>
        </Card.Body>
        <Card.Footer>
          <Button
            variant="primary"
            isLoading={createOccurrence.isPending}
            onClick={() => {
              if (!titulo || !descricao) return;
              createOccurrence.mutate(
                { titulo, descricao },
                {
                  onSuccess: () => {
                    setTitulo("");
                    setDescricao("");
                  },
                },
              );
            }}
          >
            Reportar
          </Button>
        </Card.Footer>
      </Card>

      <Table
        columns={[
          {
            key: "data",
            header: "Data",
            render: (o) => new Date(o.createdAt).toLocaleString("pt-BR"),
          },
          { key: "titulo", header: "Título", render: (o) => o.titulo },
          { key: "severidade", header: "Severidade", render: (o) => o.severidade },
          { key: "descricao", header: "Descrição", render: (o) => o.descricao },
        ]}
        rows={data?.items ?? []}
        keyExtractor={(o) => o.id}
      />
    </div>
  );
}

function AuditoriaTab({ vehicleId }: { vehicleId: string }): JSX.Element {
  const { data } = useVehicleAuditLogs(vehicleId);

  return (
    <Table
      columns={[
        {
          key: "data",
          header: "Data",
          render: (log) => new Date(log.createdAt).toLocaleString("pt-BR"),
        },
        { key: "acao", header: "Ação", render: (log) => log.acao },
      ]}
      rows={data?.items ?? []}
      keyExtractor={(log) => log.id}
    />
  );
}

/**
 * `FormField` clona o filho injetando `hasError`/`id`/`aria-describedby`
 * — contrato que só `Input`/`Select` (do Design System) sabem consumir.
 * Um `<input type="file">` nativo repassaria `hasError` direto para o
 * DOM (bug real encontrado testando esta tela no navegador: React
 * avisava sobre o atributo `haserror` desconhecido) — por isso upload
 * de arquivo usa este wrapper simples em vez de `FormField`.
 */
function FileField({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-text">{label}</span>
      {children}
    </div>
  );
}
