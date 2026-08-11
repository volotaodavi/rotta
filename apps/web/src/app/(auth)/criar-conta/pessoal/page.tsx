"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { CheckCircle2 } from "@rotta/icons";
import { Button, Card, FormField, Input, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { RegisterPessoalInput } from "@rotta/api-client";

import { TermsAcceptanceCheckbox } from "@/components/terms-acceptance-checkbox";

const INITIAL_STATE: RegisterPessoalInput = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  senha: "",
  aceiteTermos: true,
};

/**
 * Cadastro self-service da Área Pessoal (Responsável, briefing
 * "Marketplace") — cria diretamente a conta (sem tenant/empresa),
 * mesma operação de `POST /auth/register/pessoal` já usada pelo app
 * mobile. Quem já tem um código de convite de uma escola/empresa
 * continua podendo usá-lo (o vínculo é anexado à mesma conta), mas ele
 * deixou de ser a única porta de entrada da Área Pessoal.
 */
export default function CriarContaPessoalPage(): JSX.Element {
  const { registerPessoal } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<RegisterPessoalInput>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  function updateField<K extends keyof RegisterPessoalInput>(
    key: K,
    value: RegisterPessoalInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await registerPessoal(form);
      setIsDone(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao criar sua conta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Antes desta entrega, a experiência da Área Pessoal (meus filhos,
  // acompanhamento ao vivo) só existia no app mobile — este passo
  // mandava o Responsável "abrir o app" depois de criar a conta aqui.
  // Agora que `/alunos` existe no próprio painel web (Dossiê 45 — gap
  // C), a conta recém-criada (já autenticada, mesma sessão) segue
  // direto para lá.
  if (isDone) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <Typography variant="headline" as="h1">
          Conta criada!
        </Typography>
        <Typography variant="body" color="muted">
          Sua conta de Responsável já está pronta. Cadastre seu filho ou dependente para começar a
          acompanhar o transporte escolar em tempo real — no painel web ou no app Rotta, com o mesmo
          login.
        </Typography>
        <Button variant="primary" fullWidth onClick={() => router.replace("/alunos/novo")}>
          Cadastrar meu primeiro aluno
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-10">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Área Pessoal</Typography>
        <Typography variant="body" color="muted">
          Crie sua conta de Responsável. Depois de entrar, você cadastra seus filhos e busca
          transportadores no Marketplace.
        </Typography>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Body className="grid grid-cols-1 gap-4">
            <FormField label="Nome completo" isRequired>
              <Input
                required
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
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
            <FormField label="Telefone" isRequired>
              <Input
                required
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
              />
            </FormField>
            <FormField label="CPF" isRequired>
              <Input
                required
                value={form.cpf}
                onChange={(event) => updateField("cpf", event.target.value)}
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
                value={form.senha}
                onChange={(event) => updateField("senha", event.target.value)}
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
              fullWidth
            >
              Criar conta
            </Button>
          </Card.Footer>
        </Card>
      </form>

      <Typography variant="bodySmall" color="muted" className="text-center">
        Recebeu um código de convite de uma escola ou empresa de transporte?{" "}
        <Link href="/convite" className="text-primary hover:underline">
          Use seu código aqui
        </Link>
        .
      </Typography>
    </div>
  );
}
