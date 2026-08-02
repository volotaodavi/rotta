"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Button, FormField, Input, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Login do Admin Rotta (Dossiê 15, `AUTH-02`) — mesma conta/API do
 * restante da plataforma; o backend rejeita quem não tiver
 * `isAdminRotta` como Admin Rotta (essas contas são criadas
 * internamente pela equipe, nunca por self-service).
 */
export default function EntrarPage(): JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await login({ identificador, senha });
      if ("requiresProfileSelection" in result) {
        setErrorMessage("Esta conta não é uma conta de Administrador Rotta.");
        return;
      }
      if (result.user.role !== "admin_rotta") {
        setErrorMessage("Esta conta não tem acesso ao painel interno da Rotta.");
        return;
      }
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Rotta Admin</Typography>
        <Typography variant="bodySmall" color="muted">
          Painel interno da equipe Rotta
        </Typography>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <FormField label="Email, telefone ou CPF" isRequired>
          <Input
            required
            autoComplete="username"
            value={identificador}
            onChange={(event) => setIdentificador(event.target.value)}
          />
        </FormField>
        <FormField label="Senha" isRequired>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />
        </FormField>

        {errorMessage && (
          <Typography variant="bodySmall" color="danger">
            {errorMessage}
          </Typography>
        )}

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </div>
  );
}
