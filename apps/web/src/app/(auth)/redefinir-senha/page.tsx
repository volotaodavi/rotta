"use client";

import { ApiError } from "@rotta/api-client";
import { Eye, EyeOff } from "@rotta/icons";
import { Button, FormField, Input, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { authApi } from "@/lib/api-client";

/**
 * Segundo passo do "esqueci minha senha" (Dossiê 15, `AUTH-04`) — link
 * que o e-mail de `PasswordResetNotifierService` envia
 * (`/redefinir-senha?token=...`). `Suspense` em volta de
 * `useSearchParams()` (exigência do App Router pra rotas estáticas,
 * mesmo padrão de `/criar-conta/empresa`).
 */
export default function RedefinirSenhaPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaContent />
    </Suspense>
  );
}

function RedefinirSenhaContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenDaUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenDaUrl);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    if (novaSenha !== confirmarSenha) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, novaSenha);
      setConcluido(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível redefinir a senha. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (concluido) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <Typography variant="title">Senha redefinida!</Typography>
        <Typography variant="body" color="muted">
          Sua senha foi alterada com sucesso. Todas as sessões anteriores foram encerradas por
          segurança.
        </Typography>
        <Button variant="primary" fullWidth onClick={() => router.replace("/entrar")}>
          Entrar agora
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Redefinir senha</Typography>
        <Typography variant="bodySmall" color="muted">
          Escolha uma nova senha para sua conta.
        </Typography>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        {!tokenDaUrl && (
          <FormField
            label="Código recebido por e-mail"
            isRequired
            helperText="Cole aqui o código do e-mail, caso o link não tenha preenchido sozinho."
          >
            <Input required value={token} onChange={(event) => setToken(event.target.value)} />
          </FormField>
        )}

        <FormField label="Nova senha" isRequired>
          <div className="relative">
            <Input
              type={mostrarSenha ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              className="pr-10"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((atual) => !atual)}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FormField>

        <FormField label="Confirmar nova senha" isRequired>
          <Input
            type={mostrarSenha ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
          />
        </FormField>

        {errorMessage && (
          <Typography variant="bodySmall" color="danger">
            {errorMessage}
          </Typography>
        )}

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Redefinir senha
        </Button>
      </form>

      <Typography variant="bodySmall" color="muted" className="text-center">
        <Link href="/esqueci-senha" className="font-semibold text-primary">
          Pedir um novo link
        </Link>
      </Typography>
    </div>
  );
}
