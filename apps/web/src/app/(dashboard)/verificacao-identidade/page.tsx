"use client";

import { DiditSdk } from "@didit-protocol/sdk-web";
import { useAuth } from "@rotta/auth/web";
import { BadgeCheck, Loader2, ShieldAlert, ShieldCheck } from "@rotta/icons";
import { Badge, Button, Card, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { IdentityVerificationStatus } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import {
  useCreateIdentityVerificationSession,
  useMyIdentityVerification,
  useRefreshMyIdentityVerification,
} from "@/features/identity-verification/hooks/use-identity-verification";

const STATUS_LABEL: Record<IdentityVerificationStatus, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  EXPIRADA: "Expirada",
};

const STATUS_VARIANT: Record<IdentityVerificationStatus, BadgeVariant> = {
  NAO_INICIADA: "neutral",
  EM_ANDAMENTO: "info",
  EM_ANALISE: "warning",
  APROVADA: "success",
  REPROVADA: "danger",
  EXPIRADA: "danger",
};

/** Estados que permitem (re)iniciar o fluxo — não faz sentido oferecer o botão enquanto já está EM_ANDAMENTO/EM_ANALISE. */
const RESTARTABLE: IdentityVerificationStatus[] = ["NAO_INICIADA", "REPROVADA", "EXPIRADA"];

/**
 * Verificação de identidade hospedada via Didit (Motorista/Monitor/
 * Empresa/Gestor verificando a PRÓPRIA identidade) — o mesmo endpoint
 * usado tanto por quem acessa o Painel Web diretamente quanto pelo
 * Motorista abrindo esta página numa WebView do app mobile (Perfil →
 * "Verificar identidade"), fazendo login normalmente se a WebView não
 * tiver sessão própria (sessão web isolada da sessão nativa do app,
 * mesmo padrão de `CriarEmpresaWebViewScreen`).
 *
 * A decisão final NUNCA vem da resposta do SDK (`onComplete`) — só o
 * webhook assinado (`DiditWebhookController`) altera
 * `identityVerificationStatus` de verdade; o SDK aqui só dá feedback
 * visual imediato ("você concluiu o formulário") enquanto o
 * `refetch` abaixo aguarda o webhook processar.
 */
export default function VerificacaoIdentidadePage(): JSX.Element {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useMyIdentityVerification();
  const createSession = useCreateIdentityVerificationSession();
  const refreshStatus = useRefreshMyIdentityVerification();
  const [aviso, setAviso] = useState<string | null>(null);

  async function iniciarVerificacao(): Promise<void> {
    setAviso(null);
    try {
      const session = await createSession.mutateAsync({
        callbackUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });

      DiditSdk.shared.onComplete = (result) => {
        if (result.type === "completed") {
          setAviso(
            "Formulário concluído! A confirmação pode levar alguns instantes — atualizando o status a seguir.",
          );
          void refetch();
        } else if (result.type === "failed") {
          setAviso("Não foi possível concluir a verificação agora. Tente novamente.");
        }
      };

      await DiditSdk.shared.startVerification({ url: session.url });
    } catch {
      setAviso("Não foi possível iniciar a verificação agora. Tente novamente em instantes.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const status = data?.status ?? "NAO_INICIADA";
  const podeIniciar = RESTARTABLE.includes(status);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <Typography variant="title">Verificação de identidade</Typography>
        <Typography variant="body" className="text-text-muted">
          Confirme sua identidade com a Didit — documento + biometria facial, tudo num único
          formulário guiado, sem precisar sair desta página.
        </Typography>
      </div>

      <Card>
        <Card.Header
          title={user?.nome ?? "Minha identidade"}
          action={<Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>}
        />
        <Card.Body className="flex flex-col gap-4">
          {status === "APROVADA" ? (
            <div className="flex items-center gap-3 text-success">
              <ShieldCheck size={24} />
              <Typography variant="body">
                Identidade verificada
                {data?.verifiedAt
                  ? ` em ${new Date(data.verifiedAt).toLocaleDateString("pt-BR")}`
                  : ""}
                .
              </Typography>
            </div>
          ) : status === "EM_ANDAMENTO" || status === "EM_ANALISE" ? (
            <div className="flex items-center gap-3 text-info">
              <Loader2 size={24} className="animate-spin" />
              <Typography variant="body">
                {status === "EM_ANALISE"
                  ? "Sua verificação está em análise manual — normalmente concluída em poucas horas."
                  : "Verificação em andamento — se você já concluiu o formulário, aguarde a confirmação aparecer aqui."}
              </Typography>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-text-muted">
              <ShieldAlert size={24} />
              <Typography variant="body">
                {status === "REPROVADA"
                  ? "Sua última verificação não foi aprovada — você pode tentar novamente."
                  : status === "EXPIRADA"
                    ? "Sua verificação expirou — inicie uma nova quando puder."
                    : "Você ainda não verificou sua identidade."}
              </Typography>
            </div>
          )}

          {aviso ? (
            <Typography variant="caption" className="text-text-muted">
              {aviso}
            </Typography>
          ) : null}
          {refreshStatus.isError ? (
            <Typography variant="caption" color="danger">
              Não foi possível sincronizar com a Didit agora. Tente de novo em instantes.
            </Typography>
          ) : null}

          {podeIniciar ? (
            <Button
              iconLeft={<BadgeCheck size={18} />}
              isLoading={createSession.isPending}
              onClick={() => void iniciarVerificacao()}
            >
              Verificar identidade
            </Button>
          ) : (
            <Button
              variant="secondary"
              isLoading={refreshStatus.isPending}
              onClick={() => refreshStatus.mutate()}
            >
              Atualizar status
            </Button>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
