"use client";

import { DiditSdk } from "@didit-protocol/sdk-web";
import { useAuth } from "@rotta/auth/web";
import { BadgeCheck, LifeBuoy, Loader2, ShieldAlert, ShieldCheck, X } from "@rotta/icons";
import { Badge, Button, Card, Modal, Spinner, Typography, useToast } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { IdentityVerificationStatus } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import {
  useCreateIdentityVerificationSession,
  useMyIdentityVerification,
  useRefreshMyIdentityVerification,
} from "@/features/identity-verification/hooks/use-identity-verification";
import { useCreateSupportTicket } from "@/features/support/hooks/use-support";
import { defaultRouteForRole } from "@/lib/default-route";


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
 *
 * "X" pra sair (pedido do usuário) — antes desta tela não tinha NENHUMA
 * saída própria (só o botão "Voltar" do navegador), o que é
 * particularmente ruim aqui porque o SDK da Didit abre um modal por
 * cima da própria página. Volta pra home real de cada papel
 * (`defaultRouteForRole`, mesma função usada em login/convite), nunca
 * um "/" genérico.
 */
/** `localStorage` (mesmo padrão de `use-app-mode.ts`, nunca no backend — é só "já vi esse popup", não uma permissão) — garante que o convite pra pedir ajuda do suporte aparece no máximo uma vez por usuário. */
const SUPPORT_POPUP_STORAGE_PREFIX = "rotta-support-popup-cnh:";

export default function VerificacaoIdentidadePage(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const { data, isLoading, refetch } = useMyIdentityVerification();
  const createSession = useCreateIdentityVerificationSession();
  const refreshStatus = useRefreshMyIdentityVerification();
  const createSupportTicket = useCreateSupportTicket();
  const toast = useToast();
  const [aviso, setAviso] = useState<string | null>(null);
  const [supportPopupOpen, setSupportPopupOpen] = useState(false);
  const supportPopupChecked = useRef(false);

  // Motorista/Monitor autônomo e MEI (pedido do usuário: "após a
  // validação da CNH, aparecerá um pop-up perguntando se gostaria de
  // pedir ajuda ao suporte para cadastrar os alunos + responsáveis")
  // — no schema, esse ator É o próprio dono da empresa
  // (`role === "empresa"`, `companyType` AUTONOMO/MEI, mesmo gate de
  // `useAppMode`), nunca um Motorista/Monitor FUNCIONÁRIO de uma
  // transportadora maior (esse nem chega nesta página do Painel Web —
  // usa o app mobile).
  const elegivelParaPopupSuporte =
    user?.role === "empresa" && (user.companyType === "AUTONOMO" || user.companyType === "MEI");

  useEffect(() => {
    if (supportPopupChecked.current) return;
    if (!user || !elegivelParaPopupSuporte || data?.status !== "APROVADA") return;
    supportPopupChecked.current = true;
    const jaViu = localStorage.getItem(SUPPORT_POPUP_STORAGE_PREFIX + user.id) === "1";
    if (!jaViu) setSupportPopupOpen(true);
  }, [user, elegivelParaPopupSuporte, data?.status]);

  function dispensarPopupSuporte(): void {
    setSupportPopupOpen(false);
    if (user) localStorage.setItem(SUPPORT_POPUP_STORAGE_PREFIX + user.id, "1");
  }

  async function pedirAjudaSuporte(): Promise<void> {
    try {
      await createSupportTicket.mutateAsync({
        assunto: "Ajuda para cadastrar alunos e responsáveis",
        descricao:
          "Verificação de identidade aprovada. Gostaria de ajuda do suporte da Rotta para cadastrar os alunos e os responsáveis do meu transporte.",
        categoria: "DUVIDA",
      });
      toast.success("Chamado aberto! O suporte da Rotta vai entrar em contato em breve.");
    } catch {
      toast.error("Não foi possível abrir o chamado agora. Tente de novo em instantes.");
    } finally {
      dispensarPopupSuporte();
    }
  }

  function fechar(): void {
    router.push(user ? defaultRouteForRole(user.role) : "/entrar");
  }

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
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <FecharButton onClick={fechar} />
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  const status = data?.status ?? "NAO_INICIADA";
  const podeIniciar = RESTARTABLE.includes(status);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="title">Verificação de identidade</Typography>
          <Typography variant="body" className="text-text-muted">
            Confirme sua identidade com a Didit — documento + biometria facial, tudo num único
            formulário guiado, sem precisar sair desta página.
          </Typography>
        </div>
        <FecharButton onClick={fechar} />
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

      {supportPopupOpen ? (
        <Modal
          isOpen
          onClose={dispensarPopupSuporte}
          ariaLabel="Ajuda do suporte para cadastrar alunos e responsáveis"
        >
          <Modal.Header onClose={dispensarPopupSuporte}>Identidade verificada!</Modal.Header>
          <Modal.Body className="flex flex-col items-center gap-4 py-2 text-center">
            <LifeBuoy size={40} className="text-primary" />
            <Typography variant="body">
              Agora falta só cadastrar os alunos e os responsáveis do seu transporte. Quer que o
              suporte da Rotta te ajude com isso?
            </Typography>
          </Modal.Body>
          <Modal.Footer className="flex justify-center gap-3">
            <Button variant="secondary" onClick={dispensarPopupSuporte}>
              Agora não
            </Button>
            <Button
              isLoading={createSupportTicket.isPending}
              onClick={() => void pedirAjudaSuporte()}
            >
              Sim, pedir ajuda
            </Button>
          </Modal.Footer>
        </Modal>
      ) : null}
    </div>
  );
}

function FecharButton({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar e voltar para a tela inicial"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-muted hover:text-text"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
