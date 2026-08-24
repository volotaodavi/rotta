"use client";

import { DiditSdk } from "@didit-protocol/sdk-web";
import { BadgeCheck, Loader2, ShieldAlert } from "@rotta/icons";
import { Button, Card, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { IdentityVerificationStatus } from "@rotta/api-client";

import {
  useCreateIdentityVerificationSession,
  useRefreshMyIdentityVerification,
} from "@/features/identity-verification/hooks/use-identity-verification";


/** Textos por status — nunca a mesma frase de "recusada" pra quem simplesmente nunca começou ou está aguardando análise. */
const COPY: Record<
  Exclude<IdentityVerificationStatus, "APROVADA">,
  { icone: "alerta" | "espera"; titulo: string; textoPadrao: string }
> = {
  NAO_INICIADA: {
    icone: "alerta",
    titulo: "Verifique sua identidade para continuar",
    textoPadrao: "Você ainda não verificou sua identidade — é obrigatório para usar a Rotta.",
  },
  EM_ANDAMENTO: {
    icone: "espera",
    titulo: "Verificação em andamento",
    textoPadrao:
      "Se você já concluiu o formulário, aguarde a confirmação chegar — atualize o status abaixo.",
  },
  EM_ANALISE: {
    icone: "espera",
    titulo: "Verificação em análise",
    textoPadrao: "Sua verificação está em análise manual: normalmente concluída em poucas horas.",
  },
  REPROVADA: {
    icone: "alerta",
    titulo: "Verificação de identidade recusada",
    textoPadrao: "Sua verificação de identidade não foi aprovada.",
  },
  EXPIRADA: {
    icone: "alerta",
    titulo: "Verificação expirada",
    textoPadrao: "Sua verificação expirou. Inicie uma nova para continuar.",
  },
};

/** Só estes dois estados fazem sentido oferecer "iniciar/tentar de novo" — `EM_ANDAMENTO`/`EM_ANALISE` já têm uma sessão em curso, uma nova só confundiria a análise em andamento; o botão certo pra esses dois é atualizar o status. */
const PODE_INICIAR: IdentityVerificationStatus[] = ["NAO_INICIADA", "REPROVADA", "EXPIRADA"];

/**
 * Bloqueio total do Painel Web enquanto `identityVerificationStatus !==
 * "APROVADA"` — pedido explícito do usuário: "travar quase tudo" até a
 * identidade estar de fato aprovada, mesmo tratamento de tela cheia que
 * já existia só para `REPROVADA`. `(dashboard)/layout.tsx` renderiza
 * este componente NO LUGAR de `children` — nenhuma rota do painel fica
 * acessível enquanto bloqueado, mesmo digitando a URL direto.
 *
 * `motivo` (comentário real do revisor — Didit ou Admin Rotta, ver
 * `identity-verification.service.ts`) aparece sempre que presente,
 * nunca só para `REPROVADA`: cobre também o caso de a Didit pedir
 * reenvio de foto (`Resubmitted` → `EM_ANDAMENTO`), que antes desta
 * mudança nunca mostrava motivo nenhum em lugar nenhum.
 *
 * "Tentar novamente"/"Verificar agora" reaproveita a mesma sessão
 * hospedada da Didit já usada em `/verificacao-identidade`. Criar uma
 * nova sessão já marca `EM_ANDAMENTO` no banco
 * (`IdentityVerificationService.createSession`) — a decisão final de
 * novo só vem do webhook, nunca da resposta do SDK.
 */
export function IdentityVerificationBlockScreen({
  status,
  motivo,
}: {
  status: IdentityVerificationStatus;
  motivo: string | null;
}): JSX.Element {
  const createSession = useCreateIdentityVerificationSession();
  const refreshStatus = useRefreshMyIdentityVerification();
  const [erro, setErro] = useState<string | null>(null);

  const copy = COPY[status as Exclude<IdentityVerificationStatus, "APROVADA">] ?? COPY.NAO_INICIADA;
  const podeIniciar = PODE_INICIAR.includes(status);

  async function iniciarOuTentarNovamente(): Promise<void> {
    setErro(null);
    try {
      const session = await createSession.mutateAsync({
        callbackUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
      await DiditSdk.shared.startVerification({ url: session.url });
    } catch {
      setErro("Não foi possível iniciar uma nova verificação agora. Tente novamente em instantes.");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Body className="flex flex-col items-center gap-4 py-10 text-center">
          <span
            className={
              copy.icone === "espera"
                ? "flex h-14 w-14 items-center justify-center rounded-full bg-info/10 text-info"
                : "flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger"
            }
          >
            {copy.icone === "espera" ? (
              <Loader2 size={28} className="animate-spin" />
            ) : (
              <ShieldAlert size={28} />
            )}
          </span>
          <Typography variant="title">{copy.titulo}</Typography>
          <Typography variant="body" color="muted">
            {motivo ?? copy.textoPadrao}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            O acesso ao painel fica bloqueado até a verificação ser aprovada.
          </Typography>
          {erro && (
            <Typography variant="caption" color="danger">
              {erro}
            </Typography>
          )}
          {podeIniciar ? (
            <Button
              iconLeft={<BadgeCheck size={18} />}
              isLoading={createSession.isPending}
              onClick={() => void iniciarOuTentarNovamente()}
            >
              {status === "NAO_INICIADA"
                ? "Verificar identidade agora"
                : "Tentar verificação novamente"}
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
