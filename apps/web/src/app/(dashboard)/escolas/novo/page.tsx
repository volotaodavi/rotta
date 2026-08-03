"use client";

import { ApiError } from "@rotta/api-client";
import { Button, Card, FormField, Input, Select, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import type { CreateSchoolInput, SchoolShift, SchoolType } from "@rotta/api-client";

import { useCheckSchoolDuplicates, useCreateSchool } from "@/features/schools/hooks/use-schools";
import {
  SCHOOL_ADMINISTRATIVE_DEPENDENCY_LABEL,
  SCHOOL_SHIFT_LABEL,
  SCHOOL_TYPE_LABEL,
} from "@/features/schools/labels";


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
 */
export default function NovaEscolaPage(): JSX.Element {
  const router = useRouter();
  const createSchool = useCreateSchool();
  const [form, setForm] = useState<CreateSchoolInput>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkDuplicates, setCheckDuplicates] = useState(false);

  const duplicates = useCheckSchoolDuplicates(
    checkDuplicates ? form.nomeOficial : "",
    checkDuplicates ? form.cidade : "",
    checkDuplicates ? form.estado : "",
  );

  function updateField<K extends keyof CreateSchoolInput>(
    key: K,
    value: CreateSchoolInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleArrayValue<T extends string>(key: "tipos" | "turnosAtendidos", value: T): void {
    setForm((current) => {
      const list = current[key] as T[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...current, [key]: next };
    });
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
            <div className="sm:col-span-2">
              <FormField label="Nome oficial" isRequired>
                <Input
                  required
                  value={form.nomeOficial}
                  onChange={(event) => {
                    updateField("nomeOficial", event.target.value);
                    setCheckDuplicates(false);
                  }}
                  onBlur={() => setCheckDuplicates(true)}
                />
              </FormField>
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
          {checkDuplicates && duplicates.data && duplicates.data.length > 0 && (
            <Card.Body className="border-t border-border">
              <Typography variant="bodySmall" color="danger">
                Possível escola duplicada — Rotta AI encontrou {duplicates.data.length} escola(s)
                com nome parecido na mesma cidade/estado:{" "}
                {duplicates.data.map((s) => s.nomeOficial).join(", ")}.
              </Typography>
            </Card.Body>
          )}
        </Card>

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
                onChange={(event) => {
                  updateField("cidade", event.target.value);
                  setCheckDuplicates(false);
                }}
                onBlur={() => setCheckDuplicates(true)}
              />
            </FormField>
            <FormField label="Estado (UF)" isRequired>
              <Input
                required
                maxLength={2}
                value={form.estado}
                onChange={(event) => {
                  updateField("estado", event.target.value.toUpperCase());
                  setCheckDuplicates(false);
                }}
                onBlur={() => setCheckDuplicates(true)}
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
