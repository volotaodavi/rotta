"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  PhoneInput,
  Select,
  Typography,
  isCompleteBrazilianCellphone,
} from "@rotta/ui/web";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FocusEvent, type FormEvent } from "react";

import type { RegisterEmpresaInput } from "@rotta/api-client";

import { TermsAcceptanceCheckbox } from "@/components/terms-acceptance-checkbox";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { useCnpjLookup } from "@/hooks/use-cnpj-lookup";

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
  const cnpjLookup = useCnpjLookup();
  const isMotoristaAutonomo = form.tipo === "AUTONOMO";
  // Campos travados (só leitura) assim que a Receita Federal confirma o
  // CNPJ — pedido do usuário: "não podendo alterar os dados, apenas
  // possível alterar o nome fantasia". A trava aqui é só UX (o que
  // realmente impede alteração é o backend, refazendo a mesma consulta
  // dentro de `POST /companies` — ver `CompaniesService.resolveDadosCadastrais`);
  // esconder os campos evita a pessoa perder tempo editando algo que o
  // servidor vai sobrescrever de qualquer jeito.
  const camposTravados = cnpjLookup.status === "found" && cnpjLookup.data?.ativa === true;

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

  // Confirma o CNPJ na Receita Federal ao sair do campo (Frente B) —
  // preenche razão social/endereço com os dados oficiais e sugere um
  // nome fantasia (o único campo que a pessoa pode alterar depois).
  // Autônomo usa CPF, não CNPJ: a Receita Federal não se aplica.
  async function handleCnpjBlur(event: FocusEvent<HTMLInputElement>): Promise<void> {
    if (isMotoristaAutonomo) return;
    const digits = event.target.value.replace(/\D/g, "");
    if (digits.length !== 14) return;
    const preview = await cnpjLookup.lookup(digits);
    if (!preview) return;
    setForm((current) => ({
      ...current,
      razaoSocial: preview.razaoSocial,
      nomeFantasia: current.nomeFantasia || preview.nomeFantasiaSugerido,
      cep: preview.cep,
      endereco: preview.endereco,
      numero: preview.numero,
      complemento: preview.complemento ?? "",
      bairro: preview.bairro,
      cidade: preview.cidade,
      estado: preview.estado,
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

    if (!isCompleteBrazilianCellphone(form.telefone)) {
      setErrorMessage("Telefone incompleto — digite o DDD e os 9 dígitos do celular.");
      return;
    }
    if (!isCompleteBrazilianCellphone(form.administrador.telefone)) {
      setErrorMessage(
        "Telefone do administrador incompleto — digite o DDD e os 9 dígitos do celular.",
      );
      return;
    }
    if (form.whatsapp && !isCompleteBrazilianCellphone(form.whatsapp)) {
      setErrorMessage("WhatsApp incompleto — digite o DDD e os 9 dígitos do celular.");
      return;
    }

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
            <FormField
              label={isMotoristaAutonomo ? "Nome completo" : "Razão social"}
              isRequired
              helperText={
                camposTravados
                  ? "Confirmado pela Receita Federal — não é possível editar."
                  : undefined
              }
            >
              <Input
                required
                disabled={camposTravados}
                value={form.razaoSocial}
                onChange={(event) => updateField("razaoSocial", event.target.value)}
              />
            </FormField>
            <FormField
              label={isMotoristaAutonomo ? "Como quer aparecer para as famílias" : "Nome fantasia"}
              isRequired
              helperText={
                camposTravados
                  ? "Sugerido pela Receita Federal — este é o único campo que você pode alterar."
                  : undefined
              }
            >
              <Input
                required
                value={form.nomeFantasia}
                onChange={(event) => updateField("nomeFantasia", event.target.value)}
              />
            </FormField>
            <div className={isMotoristaAutonomo ? undefined : "sm:col-span-2"}>
              <FormField
                label="CPF/CNPJ"
                isRequired
                helperText={
                  isMotoristaAutonomo
                    ? undefined
                    : cnpjLookup.status === "loading"
                      ? "Consultando a Receita Federal…"
                      : cnpjLookup.status === "not-found"
                        ? "CNPJ não encontrado na Receita Federal — confira o número ou preencha os dados manualmente."
                        : cnpjLookup.status === "error"
                          ? "Não foi possível consultar a Receita Federal agora — preencha os dados manualmente."
                          : camposTravados
                            ? "Confirmamos os dados na Receita Federal e travamos a edição — só o nome fantasia fica editável."
                            : undefined
                }
              >
                <Input
                  required
                  value={form.cpfCnpj}
                  onChange={(event) => {
                    updateField("cpfCnpj", event.target.value);
                    if (cnpjLookup.status !== "idle") cnpjLookup.reset();
                  }}
                  onBlur={(event) => void handleCnpjBlur(event)}
                />
              </FormField>
              {!isMotoristaAutonomo && cnpjLookup.status === "found" && cnpjLookup.data && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={cnpjLookup.data.ativa ? "success" : "warning"}>
                    {cnpjLookup.data.ativa
                      ? "ATIVA na Receita Federal"
                      : cnpjLookup.data.situacaoCadastral}
                  </Badge>
                  <Typography variant="bodySmall" color="muted">
                    {cnpjLookup.data.razaoSocial}
                  </Typography>
                </div>
              )}
            </div>
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
            <FormField
              label="Telefone"
              isRequired
              helperText="Só DDD + celular, ex. (11) 98765-4321"
            >
              <PhoneInput
                required
                value={form.telefone}
                onValueChange={(digits) => updateField("telefone", digits)}
              />
            </FormField>
            <FormField label="WhatsApp" helperText="Só DDD + celular, ex. (11) 98765-4321">
              <PhoneInput
                value={form.whatsapp ?? ""}
                onValueChange={(digits) => updateField("whatsapp", digits)}
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
                camposTravados
                  ? "Confirmado pela Receita Federal — não é possível editar."
                  : cepLookup.isLoading
                    ? "Buscando endereço…"
                    : cepLookup.notFound
                      ? "CEP não encontrado — preencha o endereço manualmente."
                      : "Preenche o endereço automaticamente."
              }
            >
              <Input
                required
                disabled={camposTravados}
                value={form.cep}
                onChange={(event) => updateField("cep", event.target.value)}
                onBlur={(event) => void handleCepBlur(event)}
              />
            </FormField>
            <FormField label="Endereço" isRequired>
              <Input
                required
                disabled={camposTravados}
                value={form.endereco}
                onChange={(event) => updateField("endereco", event.target.value)}
              />
            </FormField>
            <FormField label="Número" isRequired>
              <Input
                required
                disabled={camposTravados}
                value={form.numero}
                onChange={(event) => updateField("numero", event.target.value)}
              />
            </FormField>
            <FormField label="Complemento">
              <Input
                disabled={camposTravados}
                value={form.complemento}
                onChange={(event) => updateField("complemento", event.target.value)}
              />
            </FormField>
            <FormField label="Bairro" isRequired>
              <Input
                required
                disabled={camposTravados}
                value={form.bairro}
                onChange={(event) => updateField("bairro", event.target.value)}
              />
            </FormField>
            <FormField label="Cidade" isRequired>
              <Input
                required
                disabled={camposTravados}
                value={form.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
              />
            </FormField>
            <FormField label="Estado (UF)" isRequired>
              <Input
                required
                disabled={camposTravados}
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
            <FormField
              label="Telefone"
              isRequired
              helperText="Só DDD + celular, ex. (11) 98765-4321"
            >
              <PhoneInput
                required
                value={form.administrador.telefone}
                onValueChange={(digits) => updateAdminField("telefone", digits)}
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
