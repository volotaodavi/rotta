"use client";

import { ApiError, type ConverterAutonomoInput } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { FormField, Input, Typography, buttonVariants } from "@rotta/ui/web";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { useCepLookup } from "@/hooks/use-cep-lookup";
import { companiesApi } from "@/lib/api-client";

const INITIAL_STATE: ConverterAutonomoInput = {
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  nomeFantasia: "",
};

/**
 * "Trabalho por conta própria": o autônomo/MEI virando a própria
 * transportadora SEM recadastro (`POST /companies/me/autonomo`).
 *
 * Por que este formulário existe em vez da conversão acontecer sozinha
 * num clique: `registerAutonomo` nunca coletou endereço, e `Company`
 * exige CEP/endereço/número/bairro/cidade/estado como obrigatórios.
 * Nome, e-mail, telefone e CPF o backend lê da conta autenticada, então
 * não aparecem aqui: pedir de novo seria o recadastro que esta tela
 * existe para evitar.
 *
 * O link antigo apontava para `/criar-conta/empresa?tipo=AUTONOMO`, que
 * cria uma conta NOVA do zero e abandona a que a pessoa acabou de
 * fazer (e-mail e CPF duplicados, verificação de identidade de novo).
 */
export function ConverterEmTransportadoraForm(): JSX.Element {
  const { user, logout } = useAuth();
  const cepLookup = useCepLookup();
  const [form, setForm] = useState<ConverterAutonomoInput>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const converter = useMutation({
    mutationFn: (input: ConverterAutonomoInput) => companiesApi.converterAutonomo(input),
  });

  function updateField<K extends keyof ConverterAutonomoInput>(
    key: K,
    value: ConverterAutonomoInput[K],
  ): void {
    setForm((atual) => ({ ...atual, [key]: value }));
  }

  async function handleCepBlur(): Promise<void> {
    const endereco = await cepLookup.lookup(form.cep);
    if (!endereco) return;
    setForm((atual) => ({
      ...atual,
      endereco: endereco.endereco || atual.endereco,
      bairro: endereco.bairro || atual.bairro,
      cidade: endereco.cidade || atual.cidade,
      estado: endereco.estado || atual.estado,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setErrorMessage(null);
    converter.mutate(form, {
      onError: (error) => {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Não foi possível criar sua transportadora agora. Tente de novo.",
        );
      },
    });
  }

  /*
    A sessão em memória não sabe da empresa nova (o token só ganha
    `companyId` no próximo login), então em vez de tentar um refresh
    mágico no meio da navegação a tela pede o que o resto do app já
    pede nessa situação: entrar de novo.
  */
  if (converter.isSuccess) {
    return (
      <div className="flex w-full flex-col gap-3 text-center">
        <Typography variant="title">Transportadora criada</Typography>
        <Typography variant="body" color="muted">
          {converter.data.nomeFantasia} já é sua, {user?.nome?.split(" ")[0] ?? ""}. Entre novamente
          para acessar o painel como transportadora.
        </Typography>
        <button
          type="button"
          onClick={() => void logout()}
          className={buttonVariants({ variant: "primary" })}
        >
          Entrar novamente
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 text-left">
      <Typography variant="bodySmall" color="muted">
        Sua conta, seu CPF e sua verificação de identidade continuam as mesmas. Falta só o endereço,
        que toda transportadora precisa ter.
      </Typography>

      <FormField
        label="Nome da sua transportadora (opcional)"
        helperText="Como as famílias vão te ver. Em branco, usamos seu nome."
      >
        <Input
          placeholder="Ex.: Van do Danilo"
          value={form.nomeFantasia ?? ""}
          onChange={(event) => updateField("nomeFantasia", event.target.value)}
        />
      </FormField>

      <FormField
        label="CEP"
        isRequired
        helperText={
          cepLookup.isLoading
            ? "Buscando endereço…"
            : cepLookup.notFound
              ? "CEP não encontrado. Preencha os campos abaixo manualmente."
              : undefined
        }
      >
        <Input
          required
          inputMode="numeric"
          placeholder="00000-000"
          value={form.cep}
          onChange={(event) => updateField("cep", event.target.value)}
          onBlur={() => void handleCepBlur()}
        />
      </FormField>

      <FormField label="Endereço" isRequired>
        <Input
          required
          value={form.endereco}
          onChange={(event) => updateField("endereco", event.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <FormField label="Bairro" isRequired>
        <Input
          required
          value={form.bairro}
          onChange={(event) => updateField("bairro", event.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <FormField label="Cidade" isRequired>
          <Input
            required
            value={form.cidade}
            onChange={(event) => updateField("cidade", event.target.value)}
          />
        </FormField>
        <FormField label="UF" isRequired>
          <Input
            required
            maxLength={2}
            placeholder="RJ"
            value={form.estado}
            onChange={(event) => updateField("estado", event.target.value.toUpperCase())}
          />
        </FormField>
      </div>

      {errorMessage ? (
        <Typography variant="bodySmall" color="danger">
          {errorMessage}
        </Typography>
      ) : null}

      <button
        type="submit"
        disabled={converter.isPending}
        className={buttonVariants({ variant: "primary" })}
      >
        {converter.isPending ? "Criando…" : "Criar minha transportadora"}
      </button>
    </form>
  );
}
