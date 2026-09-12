import { Loader2, ShieldAlert, ShieldCheck, X } from "@rotta/icons/native";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import type { IdentityVerificationStatus } from "@rotta/api-client";

import { AuthButton } from "@/features/auth/components";
import {
  useCreateIdentityVerificationSession,
  useMyIdentityVerification,
  useRefreshMyIdentityVerification,
} from "@/features/driver/hooks/use-identity-verification";
import { useTheme } from "@/providers/theme-provider";

/** Mirror exato da copy de `apps/web/.../identity-verification-block-screen.tsx` + `verificacao-identidade/page.tsx` — nunca a mesma frase de "recusada" pra quem simplesmente nunca começou ou está aguardando análise. */
const COPY: Record<
  Exclude<IdentityVerificationStatus, "APROVADA">,
  { icone: "alerta" | "espera"; titulo: string; textoPadrao: string }
> = {
  NAO_INICIADA: {
    icone: "alerta",
    titulo: "Verifique sua identidade",
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
    textoPadrao: "Sua última verificação não foi aprovada, mas você pode tentar novamente.",
  },
  EXPIRADA: {
    icone: "alerta",
    titulo: "Verificação expirada",
    textoPadrao: "Sua verificação expirou. Inicie uma nova para continuar.",
  },
};

/** Só estes três estados fazem sentido oferecer "iniciar/tentar de novo" — `EM_ANDAMENTO`/`EM_ANALISE` já têm uma sessão em curso. */
const PODE_INICIAR: IdentityVerificationStatus[] = ["NAO_INICIADA", "REPROVADA", "EXPIRADA"];

/**
 * Card de status da verificação de identidade — usado tanto pelo
 * bloqueio total (`IdentityVerificationBlockedScreen`, enquanto
 * `status !== "APROVADA"`) quanto pela entrada voluntária no Perfil
 * (`VerificacaoIdentidadeScreen`, reaberta a qualquer momento pra
 * conferir o status). Único ponto de verdade da lógica — evita as duas
 * telas dessincronizarem entre si.
 *
 * 100% nativo (Frente 12/09/2026 — pedido do usuário: "não deve parecer
 * com a web, mas sim o app próprio"): chama `POST
 * /identity-verification/me/sessions` DIRETO com o token nativo já
 * autenticado (nunca a página `/verificacao-identidade` do Painel Web
 * — essa exigia uma segunda sessão web, sem ponte com a nativa, e caía
 * na tela de login da Web). A resposta traz a URL hospedada da PRÓPRIA
 * Didit (`verify.didit.me/...`) — só essa etapa (captura de documento/
 * selfie por um provedor terceiro) abre numa WebView, dentro de um
 * Modal com cabeçalho nativo — mesmo padrão de qualquer app com KYC
 * hospedado (normal ver a tela do provedor só durante a captura).
 */
export function IdentityVerificationStatusCard(): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useMyIdentityVerification();
  const createSession = useCreateIdentityVerificationSession();
  const refreshStatus = useRefreshMyIdentityVerification();
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const status = data?.status ?? "NAO_INICIADA";

  async function iniciarOuTentarNovamente(): Promise<void> {
    setErro(null);
    try {
      const session = await createSession.mutateAsync(undefined);
      setSessionUrl(session.url);
    } catch {
      setErro("Não foi possível iniciar uma nova verificação agora. Tente novamente em instantes.");
    }
  }

  function fecharSessao(): void {
    setSessionUrl(null);
    void refetch();
  }

  return (
    <View style={styles.card}>
      {status === "APROVADA" ? (
        <View style={styles.statusRow}>
          <ShieldCheck size={24} color={theme.colors.success} />
          <Text style={[styles.statusTexto, { color: theme.colors.text }]}>
            Identidade verificada
            {data?.verifiedAt ? ` em ${new Date(data.verifiedAt).toLocaleDateString("pt-BR")}` : ""}
            .
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statusRow}>
            {COPY[status].icone === "espera" ? (
              <Loader2 size={24} color={theme.colors.primary} />
            ) : (
              <ShieldAlert size={24} color={theme.colors.textMuted} />
            )}
            <Text style={[styles.statusTexto, { color: theme.colors.text }]}>
              {COPY[status].titulo}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 }}>
            {data?.motivo ?? COPY[status].textoPadrao}
          </Text>
          {erro ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{erro}</Text> : null}
          {PODE_INICIAR.includes(status) ? (
            <AuthButton
              label={status === "NAO_INICIADA" ? "Verificar identidade agora" : "Tentar novamente"}
              isLoading={createSession.isPending}
              onPress={() => void iniciarOuTentarNovamente()}
            />
          ) : (
            <AuthButton
              label="Atualizar status"
              variant="secondary"
              isLoading={refreshStatus.isPending}
              onPress={() => refreshStatus.mutate()}
            />
          )}
        </>
      )}

      <Modal visible={sessionUrl !== null} animationType="slide" onRequestClose={fecharSessao}>
        <View style={[styles.modalScreen, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + theme.spacing[3] }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={fecharSessao}
            >
              <X size={22} color={theme.colors.text} />
            </Pressable>
            <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 18 }}>
              Verificação de identidade
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          {sessionUrl ? <WebView source={{ uri: sessionUrl }} style={styles.flex} /> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  flex: { flex: 1 },
  headerSpacer: { width: 22 },
  loading: { alignItems: "center", paddingVertical: 24 },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  modalScreen: { flex: 1 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  statusTexto: { flex: 1, fontSize: 15, fontWeight: "600" },
});
