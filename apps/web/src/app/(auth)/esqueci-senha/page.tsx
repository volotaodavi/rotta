"use client";

import { ApiError } from "@rotta/api-client";
import { Button, FormField, Input, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { authApi } from "@/lib/api-client";

/**
 * "Esqueci minha senha" (Dossiê 15, `AUTH-03`) — faltava por completo
 * (o backend já tinha `POST /auth/forgot-password`, mas nenhuma tela em
 * lugar nenhum chamava). Resposta SEMPRE a mesma, exista ou não a
 * conta (`RN-AUTH-03`, mesma garantia do backend) — nunca revela se um
 * e-mail está cadastrado.
 */
export default function EsqueciSenhaPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setEnviado(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <Typography variant="title">Verifique seu e-mail</Typography>
        <Typography variant="body" color="muted">
          Se houver uma conta com o e-mail <strong>{email}</strong>, enviamos um link para redefinir
          a senha. Confira também a caixa de spam.
        </Typography>
        <Link href="/entrar" className="font-semibold text-primary">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Esqueceu sua senha?</Typography>
        {/*
          "o e-mail cadastrado", e não só "o e-mail": na Rotta dá para
          entrar com e-mail, CPF ou telefone, mas a recuperação sai só
          por e-mail. Quem sempre entrou pelo telefone não tem motivo
          para lembrar qual e-mail ficou na conta. Telefone digitado
          aqui dá erro de formato e a pessoa entende; e-mail ERRADO,
          porém, devolve a mesma confirmação de sempre, porque a
          resposta é genérica de propósito para não revelar quem tem
          cadastro. Aí ela fica esperando um e-mail que nunca foi
          enviado.
        */}
        <Typography variant="bodySmall" color="muted">
          Informe o e-mail cadastrado na conta e enviaremos um link para redefinir a senha. A
          recuperação é só por e-mail, mesmo que você costume entrar com telefone ou CPF.
        </Typography>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <FormField label="E-mail" isRequired>
          <Input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>

        {errorMessage && (
          <Typography variant="bodySmall" color="danger">
            {errorMessage}
          </Typography>
        )}

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Enviar link de redefinição
        </Button>
      </form>

      <Typography variant="bodySmall" color="muted" className="text-center">
        <Link href="/entrar" className="font-semibold text-primary">
          Voltar para o login
        </Link>
      </Typography>
    </div>
  );
}
