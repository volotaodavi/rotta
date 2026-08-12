"use client";

import { ApiError } from "@rotta/api-client";
import { Button, Card, FormField, Input, PhoneInput, Spinner, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, type FormEvent } from "react";

import type { UpdateCompanyInput } from "@rotta/api-client";

import { useCompany, useUpdateCompany } from "@/features/companies/hooks/use-companies";

type FormState = UpdateCompanyInput;

/** Edição de empresa (Dossiê 16, Seção 5.1) — não permite alterar CPF/CNPJ, tipo nem o administrador, apenas dados cadastrais. */
export default function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const router = useRouter();
  const { data: company, isLoading } = useCompany(id);
  const updateCompany = useUpdateCompany(id);
  const [form, setForm] = useState<FormState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (company && !form) {
      setForm({
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        email: company.email,
        telefone: company.telefone,
        whatsapp: company.whatsapp ?? "",
        cep: company.cep,
        endereco: company.endereco,
        numero: company.numero,
        complemento: company.complemento ?? "",
        bairro: company.bairro,
        cidade: company.cidade,
        estado: company.estado,
      });
    }
  }, [company, form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form) return;
    setErrorMessage(null);
    try {
      await updateCompany.mutateAsync(form);
      router.push(`/empresas/${id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao salvar empresa.",
      );
    }
  }

  if (isLoading || !form) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Editar empresa</Typography>

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
            <FormField label="Email" isRequired>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </FormField>
            <FormField
              label="Telefone"
              isRequired
              helperText="Só DDD + celular, ex. (11) 98765-4321"
            >
              <PhoneInput
                required
                value={form.telefone ?? ""}
                onValueChange={(digits) => updateField("telefone", digits)}
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
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/empresas/${id}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={updateCompany.isPending}>
              Salvar alterações
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}
