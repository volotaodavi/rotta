"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Button, Card, FormField, Input, Typography } from "@rotta/ui/web";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getWebUrl } from "@/lib/site-config";

type Step = "credenciais" | "mfa-configurar" | "mfa-codigos-recuperacao" | "mfa-verificar";

/**
 * Login do Admin Rotta (Dossiê 15, `AUTH-02`) — mesma conta/API do
 * restante da plataforma; a tela de credenciais recusa quem não tiver
 * `role === "admin_rotta"` (ver `handleCredenciaisSubmit` abaixo).
 * Senha correta sozinha já basta — pedido do usuário em produção:
 * "desative a verificação de duas etapas para os admins... deixe o
 * login livre, apenas com a senha". `login()` não devolve mais
 * `mfaSetupRequired`/`mfaRequired` pra ninguém, então os passos
 * "mfa-configurar"/"mfa-codigos-recuperacao"/"mfa-verificar" abaixo
 * ficaram inalcançáveis na prática — mantidos porque `POST
 * /auth/mfa/setup/start`+`/auth/mfa/enable` continuam existindo pra
 * quem QUISER proteger a própria conta com TOTP por conta própria
 * (fora deste fluxo de login).
 */
export default function EntrarPage(): JSX.Element {
  const router = useRouter();
  const { login, mfaSetup, mfaEnable, mfaVerifyLogin } = useAuth();

  const [step, setStep] = useState<Step>("credenciais");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Distinto de `errorMessage`: quando a conta autenticou mas não é
  // Admin Rotta, o problema é "você está no painel errado", não "senha
  // errada" — guardado à parte pra poder renderizar um link real de
  // volta pro Painel Web (não dá pra colocar um `<a>` dentro de uma
  // `string`).
  const [notAdminAccount, setNotAdminAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");

  const [mfaSetupToken, setMfaSetupToken] = useState("");
  const [mfaChallengeToken, setMfaChallengeToken] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [usarCodigoRecuperacao, setUsarCodigoRecuperacao] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  async function handleCredenciaisSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setNotAdminAccount(false);
    setIsSubmitting(true);
    try {
      const result = await login({ identificador, senha });

      if ("requiresProfileSelection" in result) {
        setNotAdminAccount(true);
        return;
      }

      if ("mfaSetupRequired" in result) {
        const setup = await mfaSetup(result.mfaSetupToken);
        setMfaSetupToken(result.mfaSetupToken);
        setQrCodeDataUrl(setup.qrCodeDataUrl);
        setSecret(setup.secret);
        setStep("mfa-configurar");
        return;
      }

      if ("mfaRequired" in result) {
        setMfaChallengeToken(result.mfaChallengeToken);
        setStep("mfa-verificar");
        return;
      }

      if (result.user.role !== "admin_rotta") {
        setNotAdminAccount(true);
        return;
      }
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfaSetupConfirm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await mfaEnable(mfaSetupToken, code);
      setRecoveryCodes(result.recoveryCodes);
      setStep("mfa-codigos-recuperacao");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Código inválido. Tente de novo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfaVerifySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await mfaVerifyLogin(mfaChallengeToken, usarCodigoRecuperacao ? { recoveryCode } : { code });
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Código inválido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const brand = (
    <div className="flex flex-col items-center gap-2 text-center">
      <Image src="/brand/rotta-mark-512.png" alt="Rotta" width={48} height={48} priority />
      <Typography variant="title">Rotta Admin</Typography>
      <Typography variant="bodySmall" color="muted">
        Painel interno da equipe Rotta
      </Typography>
    </div>
  );

  if (step === "mfa-configurar") {
    return (
      <div className="flex flex-col gap-6">
        {brand}
        <div className="flex flex-col gap-1 text-center">
          <Typography variant="subtitle">Configure a verificação em duas etapas</Typography>
          <Typography variant="bodySmall" color="muted">
            Obrigatória para contas de Administrador Rotta: escaneie o código com Google
            Authenticator, Authy ou outro app compatível.
          </Typography>
        </div>

        {qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URI gerado em runtime pelo backend (QR do TOTP), não um asset estático que o otimizador de imagem do Next tem o que fazer com.
          <img
            src={qrCodeDataUrl}
            alt="QR code para configurar o app autenticador"
            width={200}
            height={200}
            className="mx-auto rounded-md border border-border"
          />
        ) : null}

        <details className="text-center">
          <summary className="cursor-pointer text-sm text-text-muted">
            Não consegue escanear? Digitar o código manualmente
          </summary>
          <Typography variant="bodySmall" className="mt-2 select-all break-all font-mono">
            {secret}
          </Typography>
        </details>

        <form
          onSubmit={(event) => void handleMfaSetupConfirm(event)}
          className="flex flex-col gap-4"
        >
          <FormField label="Código de 6 dígitos do app" isRequired>
            <Input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
          </FormField>

          {errorMessage && (
            <Typography variant="bodySmall" color="danger">
              {errorMessage}
            </Typography>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            Ativar verificação em duas etapas
          </Button>
        </form>
      </div>
    );
  }

  if (step === "mfa-codigos-recuperacao") {
    return (
      <div className="flex flex-col gap-6">
        {brand}
        <div className="flex flex-col gap-1 text-center">
          <Typography variant="subtitle">Guarde seus códigos de recuperação</Typography>
          <Typography variant="bodySmall" color="muted">
            Cada código funciona uma única vez, caso você perca acesso ao app autenticador. Eles só
            aparecem agora, anote em um lugar seguro.
          </Typography>
        </div>

        <Card>
          <div className="grid grid-cols-2 gap-2 p-6 font-mono text-sm">
            {recoveryCodes.map((recoveryCodeValue) => (
              <span key={recoveryCodeValue}>{recoveryCodeValue}</span>
            ))}
          </div>
        </Card>

        <Button variant="primary" fullWidth onClick={() => router.replace("/")}>
          Já salvei meus códigos, continuar
        </Button>
      </div>
    );
  }

  if (step === "mfa-verificar") {
    return (
      <div className="flex flex-col gap-6">
        {brand}
        <div className="flex flex-col gap-1 text-center">
          <Typography variant="subtitle">Verificação em duas etapas</Typography>
        </div>

        <form
          onSubmit={(event) => void handleMfaVerifySubmit(event)}
          className="flex flex-col gap-4"
        >
          {usarCodigoRecuperacao ? (
            <FormField label="Código de recuperação" isRequired>
              <Input
                required
                autoComplete="off"
                placeholder="XXXX-XXXX"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
              />
            </FormField>
          ) : (
            <FormField label="Código de 6 dígitos do app" isRequired>
              <Input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
            </FormField>
          )}

          {errorMessage && (
            <Typography variant="bodySmall" color="danger">
              {errorMessage}
            </Typography>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            Entrar
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => setUsarCodigoRecuperacao((atual) => !atual)}
          >
            {usarCodigoRecuperacao ? "Usar código do app" : "Perdi o acesso ao app autenticador"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {brand}

      <form
        onSubmit={(event) => void handleCredenciaisSubmit(event)}
        className="flex flex-col gap-4"
      >
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

        {notAdminAccount ? (
          <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
            <Typography variant="bodySmall" color="danger">
              Esta conta não tem acesso ao painel interno da Rotta.
            </Typography>
            <a
              href={`${getWebUrl()}/entrar`}
              className="text-sm font-semibold text-primary underline underline-offset-2"
            >
              Entrar no Painel Web →
            </a>
          </div>
        ) : (
          errorMessage && (
            <Typography variant="bodySmall" color="danger">
              {errorMessage}
            </Typography>
          )
        )}

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Entrar
        </Button>
      </form>

      {/* Link discreto de saída — quem chegou aqui por engano (conta de
          Empresa/Gestor/Motorista/Responsável, não Admin Rotta) não
          precisa errar login primeiro pra descobrir que está no painel
          errado. Aponta pro app `apps/web`, deploy e domínio isolados
          por decisão de segurança (Dossiê 22 §4.3). */}
      <Typography variant="bodySmall" color="muted" className="text-center">
        Não é da equipe Rotta?{" "}
        <a href={`${getWebUrl()}/entrar`} className="font-semibold text-primary">
          Entrar no Painel Web
        </a>
      </Typography>
    </div>
  );
}
