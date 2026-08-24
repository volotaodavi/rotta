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
import { use, useEffect, useState, type FormEvent } from "react";

import type { SchoolAccessPointType, SchoolStatus, UpdateSchoolInput } from "@rotta/api-client";

import { SchoolStatusBadge } from "@/features/schools/components/school-status-badge";
import {
  useCreateSchoolAccessPoint,
  useDeleteSchool,
  useLinkSchoolCompany,
  useRemoveSchoolAccessPoint,
  useSchool,
  useSchoolAccessPoints,
  useSchoolAuditLogs,
  useSchoolCompanyLinks,
  useUnlinkSchoolCompany,
  useUpdateSchool,
  useUpdateSchoolStatus,
} from "@/features/schools/hooks/use-schools";
import {
  SCHOOL_ACCESS_POINT_TYPE_LABEL,
  SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL,
} from "@/features/schools/labels";

const TABS = [
  { id: "dados", label: "Dados" },
  { id: "endereco", label: "Endereço" },
  { id: "portoes", label: "Portões" },
  { id: "vinculos", label: "Vínculos" },
  { id: "auditoria", label: "Auditoria" },
];

/**
 * Detalhe da Escola — Dados/Endereço/Portões/Vínculos/Auditoria em
 * abas (mesma decisão de `Tabs` de `veiculos/[id]`). Diferencial: a
 * aba "Vínculos" mostra e gerencia quais EMPRESAS atendem esta escola
 * (catálogo compartilhado) — nunca dados de tenant único.
 */
export default function EscolaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const router = useRouter();
  const { data: school, isLoading, isError, refetch, isFetching } = useSchool(id);
  const [activeTab, setActiveTab] = useState("dados");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  /** Achado real (auditoria "tá dando erro"): sem isso, uma falha na busca deixava a tela presa num spinner infinito, sem erro visível nem botão de tentar de novo. */
  if (isError || !school) {
    return (
      <ErrorState
        message="Não foi possível carregar esta escola."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Typography variant="title">{school.nomeOficial}</Typography>
          <SchoolStatusBadge status={school.status} />
        </div>
        <Button variant="ghost" onClick={() => router.push("/escolas")}>
          Voltar
        </Button>
      </div>

      <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === "dados" && <DadosTab schoolId={id} />}
      {activeTab === "endereco" && <EnderecoTab schoolId={id} />}
      {activeTab === "portoes" && <PortoesTab schoolId={id} />}
      {activeTab === "vinculos" && <VinculosTab schoolId={id} />}
      {activeTab === "auditoria" && <AuditoriaTab schoolId={id} />}
    </div>
  );
}

function DadosTab({ schoolId }: { schoolId: string }): JSX.Element {
  const router = useRouter();
  const { data: school } = useSchool(schoolId);
  const updateSchool = useUpdateSchool(schoolId);
  const updateStatus = useUpdateSchoolStatus(schoolId);
  const deleteSchool = useDeleteSchool();

  const [form, setForm] = useState<UpdateSchoolInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (school && !form) {
      setForm({
        codigoInep: school.codigoInep ?? "",
        nomeOficial: school.nomeOficial,
        nomeFantasia: school.nomeFantasia ?? "",
        redeEnsino: school.redeEnsino ?? "",
        dependenciaAdministrativa: school.dependenciaAdministrativa,
        cnpj: school.cnpj ?? "",
        telefone: school.telefone ?? "",
        whatsapp: school.whatsapp ?? "",
        email: school.email ?? "",
        website: school.website ?? "",
      });
    }
  }, [school, form]);

  if (!school || !form) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  function updateField<K extends keyof UpdateSchoolInput>(
    key: K,
    value: UpdateSchoolInput[K],
  ): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form) return;
    setErrorMessage(null);
    try {
      await updateSchool.mutateAsync(form);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao salvar.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header
            title="Cadastro"
            action={
              <Typography variant="caption" color="muted">
                Código interno: {school.codigoInterno}
              </Typography>
            }
          />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nome oficial" isRequired>
              <Input
                required
                value={form.nomeOficial}
                onChange={(event) => updateField("nomeOficial", event.target.value)}
              />
            </FormField>
            <FormField label="Nome fantasia">
              <Input
                value={form.nomeFantasia ?? ""}
                onChange={(event) => updateField("nomeFantasia", event.target.value)}
              />
            </FormField>
            <FormField label="Código INEP">
              <Input
                value={form.codigoInep ?? ""}
                onChange={(event) => updateField("codigoInep", event.target.value)}
              />
            </FormField>
            <FormField label="Rede de ensino">
              <Input
                value={form.redeEnsino ?? ""}
                onChange={(event) => updateField("redeEnsino", event.target.value)}
              />
            </FormField>
            <FormField label="Dependência administrativa">
              <Select
                value={form.dependenciaAdministrativa}
                onChange={(event) =>
                  updateField(
                    "dependenciaAdministrativa",
                    event.target.value as UpdateSchoolInput["dependenciaAdministrativa"],
                  )
                }
              >
                {Object.entries(SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="CNPJ">
              <Input
                value={form.cnpj ?? ""}
                onChange={(event) => updateField("cnpj", event.target.value)}
              />
            </FormField>
            <FormField label="Telefone">
              <Input
                value={form.telefone ?? ""}
                onChange={(event) => updateField("telefone", event.target.value)}
              />
            </FormField>
            <FormField label="WhatsApp">
              <Input
                value={form.whatsapp ?? ""}
                onChange={(event) => updateField("whatsapp", event.target.value)}
              />
            </FormField>
            <FormField label="E-mail">
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </FormField>
            <FormField label="Website">
              <Input
                value={form.website ?? ""}
                onChange={(event) => updateField("website", event.target.value)}
              />
            </FormField>
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="primary" isLoading={updateSchool.isPending}>
              Salvar alterações
            </Button>
          </Card.Footer>
        </Card>
      </form>

      <Card>
        <Card.Header title="Status" />
        <Card.Body>
          <FormField label="Status">
            <Select
              value={school.status}
              onChange={(event) => updateStatus.mutate(event.target.value as SchoolStatus)}
            >
              {(["ATIVA", "INATIVA", "EM_ANALISE", "ARQUIVADA"] as SchoolStatus[]).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormField>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Excluir escola" />
        <Card.Body>
          <Typography variant="bodySmall" color="muted">
            A escola é removida das listagens, mas o histórico é sempre preservado, inclusive os
            vínculos com outras empresas que ainda a atendem.
          </Typography>
        </Card.Body>
        <Card.Footer>
          <Button
            variant="danger"
            isLoading={deleteSchool.isPending}
            onClick={() => {
              deleteSchool.mutate(schoolId, { onSuccess: () => router.replace("/escolas") });
            }}
          >
            Excluir
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

function EnderecoTab({ schoolId }: { schoolId: string }): JSX.Element {
  const { data: school } = useSchool(schoolId);
  const updateSchool = useUpdateSchool(schoolId);
  const [form, setForm] = useState<UpdateSchoolInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (school && !form) {
      setForm({
        cep: school.cep,
        logradouro: school.logradouro,
        numero: school.numero,
        complemento: school.complemento ?? "",
        bairro: school.bairro,
        cidade: school.cidade,
        estado: school.estado,
        pais: school.pais,
        observacoesLocalizacao: school.observacoesLocalizacao ?? "",
      });
    }
  }, [school, form]);

  if (!school || !form) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  function updateField<K extends keyof UpdateSchoolInput>(
    key: K,
    value: UpdateSchoolInput[K],
  ): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form) return;
    setErrorMessage(null);
    try {
      await updateSchool.mutateAsync(form);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao salvar.");
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Endereço" />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="CEP" isRequired>
            <Input
              required
              value={form.cep}
              onChange={(event) => updateField("cep", event.target.value)}
            />
          </FormField>
          <FormField label="Logradouro" isRequired>
            <Input
              required
              value={form.logradouro}
              onChange={(event) => updateField("logradouro", event.target.value)}
            />
          </FormField>
          <FormField label="Número" isRequired>
            <Input
              required
              value={form.numero}
              onChange={(event) => updateField("numero", event.target.value)}
            />
          </FormField>
          <FormField label="Complemento">
            <Input
              value={form.complemento ?? ""}
              onChange={(event) => updateField("complemento", event.target.value)}
            />
          </FormField>
          <FormField label="Bairro" isRequired>
            <Input
              required
              value={form.bairro}
              onChange={(event) => updateField("bairro", event.target.value)}
            />
          </FormField>
          <FormField label="Cidade" isRequired>
            <Input
              required
              value={form.cidade}
              onChange={(event) => updateField("cidade", event.target.value)}
            />
          </FormField>
          <FormField label="Estado (UF)" isRequired>
            <Input
              required
              maxLength={2}
              value={form.estado}
              onChange={(event) => updateField("estado", event.target.value.toUpperCase())}
            />
          </FormField>
          <FormField label="País">
            <Input
              value={form.pais ?? ""}
              onChange={(event) => updateField("pais", event.target.value)}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              label="Observações de localização"
              helperText="Ex.: qual portão é o único aberto ao transporte escolar"
            >
              <Input
                value={form.observacoesLocalizacao ?? ""}
                onChange={(event) => updateField("observacoesLocalizacao", event.target.value)}
              />
            </FormField>
          </div>
          {school.latitude && school.longitude && (
            <div className="sm:col-span-2">
              <Typography variant="caption" color="muted">
                Coordenadas: {school.latitude.toFixed(6)}, {school.longitude.toFixed(6)}
              </Typography>
            </div>
          )}
        </Card.Body>
        <Card.Footer>
          {errorMessage && (
            <Typography variant="bodySmall" color="danger" className="mr-auto">
              {errorMessage}
            </Typography>
          )}
          <Button type="submit" variant="primary" isLoading={updateSchool.isPending}>
            Salvar endereço
          </Button>
        </Card.Footer>
      </Card>
    </form>
  );
}

function PortoesTab({ schoolId }: { schoolId: string }): JSX.Element {
  const { data: points } = useSchoolAccessPoints(schoolId);
  const createPoint = useCreateSchoolAccessPoint(schoolId);
  const removePoint = useRemoveSchoolAccessPoint(schoolId);
  const [tipo, setTipo] = useState<SchoolAccessPointType>("PONTO_EMBARQUE");
  const [nome, setNome] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [observacoes, setObservacoes] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Novo portão / ponto de embarque" />
        <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Tipo">
            <Select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as SchoolAccessPointType)}
            >
              {Object.entries(SCHOOL_ACCESS_POINT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Nome" isRequired>
            <Input required value={nome} onChange={(event) => setNome(event.target.value)} />
          </FormField>
          <FormField label="Latitude" isRequired>
            <Input
              required
              type="number"
              step="any"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
            />
          </FormField>
          <FormField label="Longitude" isRequired>
            <Input
              required
              type="number"
              step="any"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Observações">
              <Input value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
            </FormField>
          </div>
        </Card.Body>
        <Card.Footer>
          <Button
            variant="primary"
            isLoading={createPoint.isPending}
            onClick={() => {
              if (!nome || !latitude || !longitude) return;
              createPoint.mutate(
                {
                  tipo,
                  nome,
                  latitude: Number(latitude),
                  longitude: Number(longitude),
                  observacoes: observacoes || undefined,
                },
                {
                  onSuccess: () => {
                    setNome("");
                    setLatitude("");
                    setLongitude("");
                    setObservacoes("");
                  },
                },
              );
            }}
          >
            Cadastrar
          </Button>
        </Card.Footer>
      </Card>

      <Table
        columns={[
          {
            key: "tipo",
            header: "Tipo",
            render: (p) => SCHOOL_ACCESS_POINT_TYPE_LABEL[p.tipo],
          },
          { key: "nome", header: "Nome", render: (p) => p.nome },
          {
            key: "coordenadas",
            header: "Coordenadas",
            render: (p) => `${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`,
          },
          {
            key: "observacoes",
            header: "Observações",
            render: (p) => p.observacoes ?? "Não informado",
          },
          {
            key: "acoes",
            header: "",
            render: (p) => (
              <Button variant="ghost" size="sm" onClick={() => removePoint.mutate(p.id)}>
                Remover
              </Button>
            ),
          },
        ]}
        rows={points ?? []}
        keyExtractor={(p) => p.id}
        emptyMessage="Nenhum portão ou ponto de embarque cadastrado ainda."
      />
    </div>
  );
}

function VinculosTab({ schoolId }: { schoolId: string }): JSX.Element {
  const { data: links } = useSchoolCompanyLinks(schoolId);
  const linkCompany = useLinkSchoolCompany(schoolId);
  const unlinkCompany = useUnlinkSchoolCompany(schoolId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeLinks = (links?.items ?? []).filter((link) => !link.desvinculadoEm);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header title="Empresas que atendem esta escola" />
        <Card.Body>
          <Typography variant="bodySmall" color="muted">
            Escolas são um catálogo compartilhado: mais de uma empresa de transporte pode atender a
            mesma escola simultaneamente.
          </Typography>
        </Card.Body>
        <Card.Footer>
          {errorMessage && (
            <Typography variant="bodySmall" color="danger" className="mr-auto">
              {errorMessage}
            </Typography>
          )}
          <Button
            variant="primary"
            isLoading={linkCompany.isPending}
            onClick={() => {
              setErrorMessage(null);
              linkCompany.mutate(undefined, {
                onError: (error) =>
                  setErrorMessage(
                    error instanceof ApiError ? error.message : "Erro ao vincular sua empresa.",
                  ),
              });
            }}
          >
            Vincular minha empresa
          </Button>
        </Card.Footer>
      </Card>

      <Table
        columns={[
          { key: "companyId", header: "Empresa", render: (link) => link.companyId },
          {
            key: "vinculadoEm",
            header: "Vinculado em",
            render: (link) => new Date(link.vinculadoEm).toLocaleDateString("pt-BR"),
          },
          {
            key: "status",
            header: "Status",
            render: (link) => (link.desvinculadoEm ? "Encerrado" : "Ativo"),
          },
          {
            key: "acoes",
            header: "",
            render: (link) =>
              link.desvinculadoEm ? null : (
                <Button variant="ghost" size="sm" onClick={() => unlinkCompany.mutate(link.id)}>
                  Desvincular
                </Button>
              ),
          },
        ]}
        rows={links?.items ?? []}
        keyExtractor={(link) => link.id}
        emptyMessage="Nenhuma empresa vinculada a esta escola ainda."
      />
      <Typography variant="caption" color="muted">
        {activeLinks.length} empresa(s) atendendo esta escola atualmente.
      </Typography>
    </div>
  );
}

function AuditoriaTab({ schoolId }: { schoolId: string }): JSX.Element {
  const { data } = useSchoolAuditLogs(schoolId);

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
      emptyMessage="Nenhum evento de auditoria registrado ainda."
    />
  );
}
