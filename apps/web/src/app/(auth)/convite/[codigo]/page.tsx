"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Button, FormField, Input, Spinner, Typography } from "@rotta/ui/web";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent } from "react";

import { TermsAcceptanceCheckbox } from "@/components/terms-acceptance-checkbox";
import { authApi } from "@/lib/api-client";

const ROLE_LABEL: Record<string, string> = {
  gestor: "Gestor",
  motorista: "Motorista",
  monitor: "Monitor",
  responsavel: "Responsável",
  escola: "Escola",
};

/**
 * Resgate de convite (Dossiê 15, `AUTH-01-A1`) — "Confirmar identidade
 * -> Completar cadastro -> Entrar normalmente". Nunca cria uma nova
 * empresa: o vínculo é anexado ao tenant que já existe.
 */
export default function ResgatarConvitePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): JSX.Element {
  const { codigo } = use(params);
  const router = useRouter();
  const { redeemInvite } = useAuth();

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invite-preview", codigo],
    queryFn: () => authApi.previewInvite(codigo),
    retry: false,
  });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await redeemInvite({ codigo, nome, email, telefone, cpf, senha, aceiteTermos: true });
      router.replace("/empresa");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao completar o cadastro.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 text-center">
        <Typography variant="title">Convite inválido</Typography>
        <Typography variant="body" color="muted">
          Este código não existe, expirou ou já foi utilizado. Peça um novo convite.
        </Typography>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Complete seu cadastro</Typography>
        <Typography variant="bodySmall" color="muted">
          Convite de <strong>{preview.companyName}</strong> para atuar como{" "}
          {ROLE_LABEL[preview.role] ?? preview.role}.
        </Typography>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <FormField label="Nome completo" isRequired>
          <Input required value={nome} onChange={(event) => setNome(event.target.value)} />
        </FormField>
        <FormField label="Email" isRequired>
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <FormField label="Telefone" isRequired>
          <Input required value={telefone} onChange={(event) => setTelefone(event.target.value)} />
        </FormField>
        <FormField label="CPF" isRequired>
          <Input required value={cpf} onChange={(event) => setCpf(event.target.value)} />
        </FormField>
        <FormField
          label="Senha"
          isRequired
          helperText="Se você já tem uma conta Rotta, informe a senha dela para vincular este convite."
        >
          <Input
            type="password"
            required
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />
        </FormField>

        <TermsAcceptanceCheckbox checked={aceitouTermos} onChange={setAceitouTermos} />

        {errorMessage && (
          <Typography variant="bodySmall" color="danger">
            {errorMessage}
          </Typography>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          disabled={!aceitouTermos}
        >
          Entrar
        </Button>
      </form>
    </div>
  );
}
