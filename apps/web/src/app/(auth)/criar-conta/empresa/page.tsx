"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Button, Card, FormField, Input, Select, Typography } from "@rotta/ui/web";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FocusEvent, type FormEvent } from "react";

import type { RegisterEmpresaInput } from "@rotta/api-client";

import { TermsAcceptanceCheckbox } from "@/components/terms-acceptance-checkbox";
import { useCepLookup } from "@/hooks/use-cep-lookup";


const COMPANY_TYPE_OPTIONS: { value: RegisterEmpresaInput["tipo"]; label: string }[] = [
  { value: "AUTONOMO", label: "Motorista Autônomo" },
  { value: "MEI", label: "MEI" },
  { value: "LTDA", label: "LTDA" },
  { value: "SLU", label: "SLU" },
  { value: "EIRELI", label: "EIRELI" },
  { value: "OUTRO", label: "Outro" },
];

const VALID_TIPOS = new Set(COMPANY_TYPE_OPTIONS.map((option) => option.value));

function initialState(tipoFromUrl: string | null): RegisterEmpresaInput {
  const tipo =
    tipoFromUrl && VALID_TIPOS.has(tipoFromUrl as RegisterEmpresaInput["tipo"])
      ? (tipoFromUrl as RegisterEmpresaInput["tipo"])
      : "LTDA";
  return {
    razaoSocial: "",
    nomeFantasia: "",
    cpfCnpj: "",
    tipo,
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
    aceiteTermos: true,
    administrador: { nome: "", email: "", telefone: "", cpf: "", senha: "" },
  };
}

/**
 * Cadastro self-service de Empresa (Dossiê 15, `AUTH-01`) — "O cadastro
 * profissional será realizado pelo painel Web... ao finalizar: criar
 * automaticamente Empresa, Tenant, Administrador, Plano, Configurações
 * iniciais." A conta criada aqui já fica disponível no app (mesma
 * conta, "Não solicitar novo cadastro").
 *
 * `?tipo=AUTONOMO` (vindo de `/criar-conta/motorista`, "Sou autônomo
 * ou MEI") pré-seleciona o campo Tipo e troca a copy da página pra
 * linguagem de motorista — mesmo formulário/endpoint por baixo (um
 * motorista autônomo É a transportadora, `Company` com
 * `tipo: AUTONOMO`), só a apresentação muda.
 */
export default function CriarEmpresaPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerEmpresa } = useAuth();
  const [form, setForm] = useState<RegisterEmpresaInput>(() =>
    initialState(searchParams.get("tipo")),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const cepLookup = useCepLookup();
  const isMotoristaAutonomo = form.tipo === "AUTONOMO";

  function updateField<K extends keyof RegisterEmpresaInput>(
    key: K,
    value: RegisterEmpresaInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Preenche endereço/bairro/cidade/estado a partir do CEP (ViaCEP) ao
  // sair do campo — o formulário de Empresa é o mais longo do fluxo
  // self-service (7 campos de endereço); isso corta 4 deles na maioria
  // dos casos. Nunca sobrescreve o que a pessoa já digitou manualmente
  // nem bloqueia o cadastro se o CEP não for encontrado.
  async function handleCepBlur(event: FocusEvent<HTMLInputElement>): Promise<void> {
    const endereco = await cepLookup.lookup(event.target.value);
    if (!endereco) return;
    setForm((current) => ({
      ...current,
      endereco: current.endereco || endereco.endereco,
      bairro: current.bairro || endereco.bairro,
      cidade: current.cidade || endereco.cidade,
      estado: current.estado || endereco.estado,
    }));
  }

  function updateAdminField<K extends keyof RegisterEmpresaInput["administrador"]>(
    key: K,
    value: RegisterEmpresaInput["administrador"][K],
  ): void {
    setForm((current) => ({
      ...current,
      administrador: { ...current.administrador, [key]: value },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await registerEmpresa(form);
      router.replace("/empresa");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao cadastrar empresa.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-1">
        <Typography variant="title">
          {isMotoristaAutonomo ? "Cadastro de motorista autônomo" : "Criar empresa"}
        </Typography>
        {isMotoristaAutonomo && (
          <Typography variant="bodySmall" color="muted">
            Você é a própria transportadora — os mesmos dados de uma empresa, só que em seu nome. A
            mensalidade da Rotta (R$ 39,90/mês) se aplica normalmente.
          </Typography>
        )}
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header title={isMotoristaAutonomo ? "Seus dados" : "Dados da empresa"} />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={isMotoristaAutonomo ? "Nome completo" : "Razão social"} isRequired>
              <Input
                required
                value={form.razaoSocial}
                onChange={(event) => updateField("razaoSocial", event.target.value)}
              />
            </FormField>
            <FormField
              label={isMotoristaAutonomo ? "Como quer aparecer para as famílias" : "Nome fantasia"}
              isRequired
            >
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
                onChange={(event) =>
                  updateField("tipo", event.target.value as RegisterEmpresaInput["tipo"])
                }
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
            <FormField
              label="CEP"
              isRequired
              helperText={
                cepLookup.isLoading
                  ? "Buscando endereço…"
                  : cepLookup.notFound
                    ? "CEP não encontrado — preencha o endereço manualmente."
                    : "Preenche o endereço automaticamente."
              }
            >
              <Input
                required
                value={form.cep}
                onChange={(event) => updateField("cep", event.target.value)}
                onBlur={(event) => void handleCepBlur(event)}
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
          <Card.Header
            title={isMotoristaAutonomo ? "Acesso à sua conta" : "Seus dados (administrador)"}
          />
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
          <Card.Body>
            <TermsAcceptanceCheckbox checked={aceitouTermos} onChange={setAceitouTermos} />
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!aceitouTermos}
            >
              Criar empresa
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}
