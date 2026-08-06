"use client";

import { ApiError } from "@rotta/api-client";
import { Button, Card, FormField, Input, Select, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { CreateCompanyInput, CompanyType } from "@rotta/api-client";

import { useCreateCompany } from "@/features/companies/hooks/use-companies";

const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string }[] = [
  { value: "AUTONOMO", label: "Motorista Autônomo" },
  { value: "MEI", label: "MEI" },
  { value: "LTDA", label: "LTDA" },
  { value: "SLU", label: "SLU" },
  { value: "EIRELI", label: "EIRELI" },
  { value: "OUTRO", label: "Outro" },
];

type FormState = CreateCompanyInput;

const INITIAL_STATE: FormState = {
  razaoSocial: "",
  nomeFantasia: "",
  cpfCnpj: "",
  tipo: "LTDA",
  email: "",
  telefone: "",
  whatsapp: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  administrador: { nome: "", email: "", telefone: "", cpf: "", senha: "" },
};

/**
 * Cadastro de empresa (tenant) pelo Admin Rotta (Dossiê 16, Seção 5.1).
 * Cria a Company junto com o usuário Administrador em uma única
 * operação transacional (ver `CompaniesService.create` na API).
 */
export default function NovaEmpresaPage(): JSX.Element {
  const router = useRouter();
  const createCompany = useCreateCompany();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateAdminField<K extends keyof FormState["administrador"]>(
    key: K,
    value: FormState["administrador"][K],
  ): void {
    setForm((current) => ({
      ...current,
      administrador: { ...current.administrador, [key]: value },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const created = await createCompany.mutateAsync(form);
      router.push(`/empresas/${created.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao cadastrar empresa.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Nova empresa</Typography>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header title="Dados da empresa" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Razão social" isRequired>
              <Input
                required
                value={form.razaoSocial}
                onChange={(event) => updateField("razaoSocial", event.target.value)}
              />
            </FormField>
            <FormField label="Nome fantasia" isRequired>
              <Input
                required
                value={form.nomeFantasia}
                onChange={(event) => updateField("nomeFantasia", event.target.value)}
              />
            </FormField>
            <FormField label="CPF/CNPJ" isRequired>
              <Input
                required
                value={form.cpfCnpj}
                onChange={(event) => updateField("cpfCnpj", event.target.value)}
              />
            </FormField>
            <FormField label="Tipo" isRequired>
              <Select
                required
                value={form.tipo}
                onChange={(event) => updateField("tipo", event.target.value as CompanyType)}
              >
                {COMPANY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Email" isRequired>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </FormField>
            <FormField label="Telefone" isRequired>
              <Input
                required
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
              />
            </FormField>
            <FormField label="WhatsApp">
              <Input
                value={form.whatsapp}
                onChange={(event) => updateField("whatsapp", event.target.value)}
              />
            </FormField>
          </Card.Body>
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
            <FormField label="Endereço" isRequired>
              <Input
                required
                value={form.endereco}
                onChange={(event) => updateField("endereco", event.target.value)}
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
                value={form.complemento}
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
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Administrador da empresa" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nome" isRequired>
              <Input
                required
                value={form.administrador.nome}
                onChange={(event) => updateAdminField("nome", event.target.value)}
              />
            </FormField>
            <FormField label="Email" isRequired>
              <Input
                type="email"
                required
                value={form.administrador.email}
                onChange={(event) => updateAdminField("email", event.target.value)}
              />
            </FormField>
            <FormField label="Telefone" isRequired>
              <Input
                required
                value={form.administrador.telefone}
                onChange={(event) => updateAdminField("telefone", event.target.value)}
              />
            </FormField>
            <FormField label="CPF" isRequired>
              <Input
                required
                value={form.administrador.cpf}
                onChange={(event) => updateAdminField("cpf", event.target.value)}
              />
            </FormField>
            <FormField
              label="Senha"
              isRequired
              helperText="Mínimo 8 caracteres, com ao menos 1 letra e 1 número."
            >
              <Input
                type="password"
                required
                value={form.administrador.senha}
                onChange={(event) => updateAdminField("senha", event.target.value)}
              />
            </FormField>
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button type="button" variant="secondary" onClick={() => router.push("/empresas")}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={createCompany.isPending}>
              Cadastrar empresa
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}
