"use client";

import { ApiError } from "@rotta/api-client";
import { MapPin, Search, Sparkles } from "@rotta/icons";
import { Button, Card, FormField, Input, Select, Spinner, Typography } from "@rotta/ui/web";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import type { CreateSchoolInput, SchoolShift, SchoolType } from "@rotta/api-client";

import { useCreateSchool, useSuggestSchools } from "@/features/schools/hooks/use-schools";
import {
  SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL,
  SCHOOL_SHIFT_LABEL,
  SCHOOL_TYPE_LABEL,
} from "@/features/schools/labels";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { schoolsApi } from "@/lib/api-client";

const INITIAL_STATE: CreateSchoolInput = {
  nomeOficial: "",
  dependenciaAdministrativa: "MUNICIPAL",
  cep: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  tipos: [],
  turnosAtendidos: [],
};

/**
 * Cadastro de Escola (briefing "CADASTRO"/"ENDEREÇO"/"TIPOS"/
 * "DEPENDÊNCIA ADMINISTRATIVA"/"TURNOS"). Diferente de Veículo, o
 * recém-cadastrado entra num catálogo COMPARTILHADO — a empresa que
 * cadastra é automaticamente vinculada a ele no backend
 * (`SchoolsService.create`), nunca é "dona" exclusiva da escola.
 *
 * "Cadê a análise da IA após colocar o nome das escolas?" (pedido do
 * usuário) — o "Nome oficial" agora consulta o catálogo nacional já
 * sincronizado do Censo Escolar/INEP em tempo real
 * (`useSuggestSchools`, tolerante a erro de digitação, mesma Geocoding/
 * Education Sync Agent que já existia mas só era usada no cadastro de
 * Aluno). Se a escola já existir, "Vincular esta escola" evita um
 * cadastro duplicado; "Nenhuma dessas" segue pro cadastro do zero
 * normalmente.
 *
 * "Quem deve colocar a latitude e longitude é a IA, não o usuário
 * manualmente" (pedido do usuário) — este formulário NUNCA pediu
 * coordenadas (só o endereço textual); o que faltava era acionar a
 * geocodificação de verdade depois de salvar, o que agora acontece
 * sozinho no backend (`SCHOOL_CREATED_EVENT` → `GeoPipelineService.
 * geocodeSchool`, Nominatim/OSM) — o aviso abaixo do card "Endereço"
 * deixa isso explícito em vez de simplesmente não dizer nada sobre
 * mapa/localização.
 */
export default function NovaEscolaPage(): JSX.Element {
  const router = useRouter();
  const createSchool = useCreateSchool();
  const cepLookup = useCepLookup();
  const [form, setForm] = useState<CreateSchoolInput>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  const suggestions = useSuggestSchools({ q: form.nomeOficial, limit: 5 });
  const mostrarSugestoes =
    !suggestionsDismissed &&
    form.nomeOficial.trim().length >= 2 &&
    (suggestions.data?.items.length ?? 0) > 0;

  const linkExistingSchool = useMutation({
    mutationFn: (schoolId: string) => schoolsApi.linkCompany(schoolId),
  });

  function updateField<K extends keyof CreateSchoolInput>(
    key: K,
    value: CreateSchoolInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateNome(value: string): void {
    updateField("nomeOficial", value);
    setSuggestionsDismissed(false);
  }

  function toggleArrayValue<T extends string>(key: "tipos" | "turnosAtendidos", value: T): void {
    setForm((current) => {
      const list = current[key] as T[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...current, [key]: next };
    });
  }

  async function handleCepBlur(): Promise<void> {
    const address = await cepLookup.lookup(form.cep);
    if (!address) return;
    setForm((current) => ({
      ...current,
      logradouro: address.endereco || current.logradouro,
      bairro: address.bairro || current.bairro,
      cidade: address.cidade || current.cidade,
      estado: address.estado || current.estado,
    }));
  }

  async function handleVincularExistente(schoolId: string): Promise<void> {
    setErrorMessage(null);
    try {
      await linkExistingSchool.mutateAsync(schoolId);
      router.replace(`/escolas/${schoolId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível vincular esta escola agora.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    if (form.tipos.length === 0) {
      setErrorMessage("Selecione ao menos um tipo de ensino.");
      return;
    }
    if (form.turnosAtendidos.length === 0) {
      setErrorMessage("Selecione ao menos um turno atendido.");
      return;
    }
    try {
      const school = await createSchool.mutateAsync(form);
      router.replace(`/escolas/${school.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao cadastrar escola.",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Typography variant="title">Nova escola</Typography>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header title="Cadastro" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex flex-col gap-2">
              <FormField label="Nome oficial" isRequired>
                <Input
                  required
                  value={form.nomeOficial}
                  onChange={(event) => updateNome(event.target.value)}
                />
              </FormField>
              {mostrarSugestoes ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <Typography variant="caption" className="font-semibold">
                      Rotta AI encontrou {suggestions.data?.items.length} escola(s) parecida(s) no
                      catálogo nacional
                    </Typography>
                  </div>
                  <div className="flex flex-col divide-y divide-border">
                    {suggestions.data?.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-col">
                          <Typography variant="bodySmall" className="font-medium">
                            {item.nomeOficial}
                          </Typography>
                          <Typography variant="caption" color="muted">
                            {item.cidade} - {item.estado} ·{" "}
                            {SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL[item.dependenciaAdministrativa]}
                          </Typography>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          isLoading={
                            linkExistingSchool.isPending && linkExistingSchool.variables === item.id
                          }
                          onClick={() => void handleVincularExistente(item.id)}
                        >
                          Vincular esta escola
                        </Button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="self-start text-xs font-medium text-text-muted underline hover:text-text"
                    onClick={() => setSuggestionsDismissed(true)}
                  >
                    Nenhuma dessas, cadastrar do zero
                  </button>
                </div>
              ) : suggestions.isLoading && form.nomeOficial.trim().length >= 2 ? (
                <div className="flex items-center gap-2 text-text-muted">
                  <Spinner size="sm" />
                  <Typography variant="caption">Consultando o catálogo nacional...</Typography>
                </div>
              ) : null}
            </div>
            <FormField label="Nome fantasia">
              <Input
                value={form.nomeFantasia ?? ""}
                onChange={(event) => updateField("nomeFantasia", event.target.value)}
              />
            </FormField>
            <FormField
              label="Código INEP"
              helperText="Preencha apenas quando a escola já tiver um código oficial do Censo Escolar"
            >
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
            <FormField label="Dependência administrativa" isRequired>
              <Select
                required
                value={form.dependenciaAdministrativa}
                onChange={(event) =>
                  updateField(
                    "dependenciaAdministrativa",
                    event.target.value as CreateSchoolInput["dependenciaAdministrativa"],
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
            <FormField label="CNPJ (ou CPF, se autônoma)">
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
        </Card>

        <Card>
          <Card.Header title="Endereço" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <Typography variant="caption" color="muted">
                Você não precisa localizar a escola no mapa: a Rotta Geo AI calcula a latitude e a
                longitude sozinha, a partir do endereço abaixo, assim que a escola for salva.
              </Typography>
            </div>
            <FormField label="CEP" isRequired>
              <div className="flex items-center gap-2">
                <Input
                  required
                  value={form.cep}
                  onChange={(event) => updateField("cep", event.target.value)}
                  onBlur={() => void handleCepBlur()}
                />
                {cepLookup.isLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <Search className="h-4 w-4 text-text-muted" />
                )}
              </div>
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
            <div className="sm:col-span-2">
              <FormField label="Observações de localização">
                <Input
                  value={form.observacoesLocalizacao ?? ""}
                  onChange={(event) => updateField("observacoesLocalizacao", event.target.value)}
                />
              </FormField>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Tipos e turnos" />
          <Card.Body className="flex flex-col gap-4">
            <CheckboxGroup label="Tipos de ensino" isRequired>
              {(Object.entries(SCHOOL_TYPE_LABEL) as [SchoolType, string][]).map(
                ([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={form.tipos.includes(value)}
                      onChange={() => toggleArrayValue("tipos", value)}
                    />
                    {label}
                  </label>
                ),
              )}
            </CheckboxGroup>
            <CheckboxGroup label="Turnos atendidos" isRequired>
              {(Object.entries(SCHOOL_SHIFT_LABEL) as [SchoolShift, string][]).map(
                ([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={form.turnosAtendidos.includes(value)}
                      onChange={() => toggleArrayValue("turnosAtendidos", value)}
                    />
                    {label}
                  </label>
                ),
              )}
            </CheckboxGroup>
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="primary" isLoading={createSchool.isPending}>
              Cadastrar escola
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}

function CheckboxGroup({
  label,
  isRequired,
  children,
}: {
  label: string;
  isRequired?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text">
        {label}
        {isRequired && <span className="text-danger"> *</span>}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}
