"use client";

import { ApiError, isMfaChallengeResponse, isMfaSetupRequiredResponse } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Eye, EyeOff } from "@rotta/icons";
import { Button, FormField, Input, Modal, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type FormEvent } from "react";

import type { LoginMascotMood } from "@/components/login-mascot";
import type { ProfileOption } from "@rotta/api-client";

import { LoginMascot } from "@/components/login-mascot";
import { defaultRouteForRole } from "@/lib/default-route";
import { getAdminUrl } from "@/lib/site-config";

/**
 * Campo de senha com botão de mostrar/ocultar — recebe `id`/
 * `aria-describedby`/`hasError` do `cloneElement` de `FormField`
 * (Dossiê 25 §3.5) e repassa ao `Input` real por dentro, já que
 * `FormField` clona só o filho DIRETO — não dava para simplesmente
 * envolver o `Input` num `<div>` na página sem quebrar essa associação
 * com o `<label htmlFor>`.
 */
function SenhaField({
  mostrarSenha,
  onToggleMostrarSenha,
  className,
  ...rest
}: ComponentProps<typeof Input> & {
  mostrarSenha: boolean;
  onToggleMostrarSenha: () => void;
}): JSX.Element {
  return (
    <div className="relative">
      <Input
        type={mostrarSenha ? "text" : "password"}
        className={`pr-10 ${className ?? ""}`}
        {...rest}
      />
      <button
        type="button"
        onClick={onToggleMostrarSenha}
        aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
      >
        {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/**
 * Login único (Dossiê 15, `AUTH-02`) — mesma tela/API usada por
 * Landing Page/Site/Painel Web (briefing: "todas as plataformas
 * compartilharão exatamente a mesma conta"). Aceita e-mail, telefone
 * ou CPF + senha.
 */
export default function EntrarPage(): JSX.Element {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [profiles, setProfiles] = useState<ProfileOption[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Pedido do usuário em produção: nenhum link/botão pro Painel
  // Administrativo deve ficar visível pra todo mundo — só aparece (como
  // pop-up) quando o backend confirma que o identificador digitado é de
  // fato uma conta da equipe Rotta, nunca antes disso. Antes havia
  // também um link estático e permanente no fim da página, visível pra
  // qualquer visitante — removido.
  const [requiresAdminPanel, setRequiresAdminPanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mascote animado (Dossiê 41) — reage ao foco real dos campos, nunca
  // a um timer/adivinhação: "nosy" (e-mail, dado não sensível), "shy"
  // (senha sendo digitada, olhos fecham) e "exposed" (só quando a
  // própria pessoa escolheu revelar a senha via `mostrarSenha` E ela já
  // está preenchida — nunca antes disso).
  const [identificadorFocado, setIdentificadorFocado] = useState(false);
  const [senhaFocada, setSenhaFocada] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const mood: LoginMascotMood =
    mostrarSenha && senha ? "exposed" : senhaFocada ? "shy" : identificadorFocado ? "nosy" : "idle";

  async function attemptLogin(companyId?: string): Promise<void> {
    setErrorMessage(null);
    setRequiresAdminPanel(false);
    setIsSubmitting(true);
    try {
      const result = await login({ identificador, senha, companyId });
      if ("requiresProfileSelection" in result) {
        setProfiles(result.profiles);
        return;
      }
      // `login()` não devolve mais nenhuma das duas pra ninguém (login
      // nunca mais exige MFA) — guard só por tipo, pra manter o
      // TypeScript feliz sem afirmar `result.user` num branch que não
      // tem `user`.
      if (isMfaSetupRequiredResponse(result) || isMfaChallengeResponse(result)) {
        return;
      }
      // Admin Rotta não usa este painel — domínio/deploy isolados de
      // propósito (Dossiê 22 §4.3). O backend não recusa a senha certa
      // pra este papel (login() emite tokens pra qualquer conta válida,
      // pedido do usuário em produção: "desative a verificação de duas
      // etapas para os admins... deixe o login livre, apenas com a
      // senha"), e `login()` acima já persistiu essa sessão antes de
      // chegarmos aqui — `logout()` desfaz na hora, nunca deixa uma
      // sessão de Admin Rotta válida dentro do Painel Web.
      if (result.user.role === "admin_rotta") {
        await logout();
        setRequiresAdminPanel(true);
        return;
      }
      router.replace(defaultRouteForRole(result.user.role));
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
      <LoginMascot mood={mood} />

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
            onFocus={() => setIdentificadorFocado(true)}
            onBlur={() => setIdentificadorFocado(false)}
          />
        </FormField>
        <FormField label="Senha" isRequired>
          <SenhaField
            required
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            onFocus={() => setSenhaFocada(true)}
            onBlur={() => setSenhaFocada(false)}
            mostrarSenha={mostrarSenha}
            onToggleMostrarSenha={() => setMostrarSenha((atual) => !atual)}
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

      {/* Pop-up de saída pra quem é da equipe Rotta (Admin Rotta) —
          aparece SÓ depois que o backend confirma que o identificador
          digitado é de fato uma conta da equipe, nunca antes, nunca pra
          quem não digitou esse e-mail. Aponta pro app `apps/admin`,
          deploy e domínio isolados por decisão de segurança (Dossiê 22
          §4.3) — "integrar na mesma área de entrar" é este pop-up,
          nunca fundir os dois logins num só domínio/processo. */}
      {requiresAdminPanel && (
        <Modal
          isOpen
          onClose={() => setRequiresAdminPanel(false)}
          ariaLabel="Conta da equipe Rotta"
        >
          <Modal.Header onClose={() => setRequiresAdminPanel(false)}>
            Conta da equipe Rotta
          </Modal.Header>
          <Modal.Body className="flex flex-col items-center gap-3 py-4 text-center">
            <Typography variant="bodySmall" color="muted">
              Esta conta é da equipe Rotta e exige o Painel Administrativo (login com verificação em
              duas etapas).
            </Typography>
          </Modal.Body>
          <Modal.Footer className="flex justify-center">
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = `${getAdminUrl()}/entrar`;
              }}
            >
              Entrar no Painel Administrativo
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
