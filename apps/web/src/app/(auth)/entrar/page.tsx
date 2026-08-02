"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Button, FormField, Input, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { ProfileOption } from "@rotta/api-client";

/**
 * Login único (Dossiê 15, `AUTH-02`) — mesma tela/API usada por
 * Landing Page/Site/Painel Web (briefing: "todas as plataformas
 * compartilharão exatamente a mesma conta"). Aceita e-mail, telefone
 * ou CPF + senha.
 */
export default function EntrarPage(): JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [profiles, setProfiles] = useState<ProfileOption[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function attemptLogin(companyId?: string): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await login({ identificador, senha, companyId });
      if ("requiresProfileSelection" in result) {
        setProfiles(result.profiles);
        return;
      }
      router.replace("/empresa");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await attemptLogin();
  }

  if (profiles) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <Typography variant="title">Escolha um perfil</Typography>
          <Typography variant="bodySmall" color="muted">
            Sua conta está vinculada a mais de uma empresa.
          </Typography>
        </div>
        <div className="flex flex-col gap-2">
          {profiles.map((profile) => (
            <Button
              key={profile.companyId}
              variant="secondary"
              fullWidth
              isLoading={isSubmitting}
              onClick={() => void attemptLogin(profile.companyId)}
            >
              {profile.companyName}
            </Button>
          ))}
        </div>
        {errorMessage && (
          <Typography variant="bodySmall" color="danger">
            {errorMessage}
          </Typography>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Entrar na Rotta</Typography>
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

      <Typography variant="bodySmall" color="muted" className="text-center">
        Ainda não tem conta?{" "}
        <Link href="/criar-conta" className="font-semibold text-primary">
          Criar conta
        </Link>
      </Typography>
    </div>
  );
}
