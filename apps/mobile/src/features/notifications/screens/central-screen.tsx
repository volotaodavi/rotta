import {
  Backpack,
  Bus,
  CreditCard,
  LayoutGrid,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "@rotta/icons/native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "../hooks/use-notifications";
import {
  NOTIFICATION_TYPE_ICON,
  NOTIFICATION_TYPE_TONE,
  type NotificationColorTone,
} from "../labels";

import type { NotificationsStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NotificationEventType } from "@rotta/api-client";
import type { Theme } from "@rotta/theme";

import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/** Resolve o "tom" (`NotificationColorTone`) pra uma cor real de `theme.colors` — nunca uma cor solta. */
function resolveToneColor(theme: Theme, tone: NotificationColorTone): string {
  switch (tone) {
    case "success":
      return theme.colors.success;
    case "primary":
      return theme.colors.primary;
    case "warning":
      return theme.colors.warning;
    case "danger":
      return theme.colors.danger;
    case "info":
      return theme.colors.info;
    case "muted":
    default:
      return theme.colors.textMuted;
  }
}

type Props = NativeStackScreenProps<NotificationsStackParamList, "Central">;

/**
 * Filtros por CATEGORIA (tela 12 da referência, "Notificações -
 * Responsável": Todas · Viagem · Aluno · Segurança · Pagamentos) —
 * antes eram filtros por estado de leitura (Todas/Não lidas/Favoritas),
 * que não existem na referência. O estado de leitura continua visível
 * por item (negrito + ponto azul) e "não lidas" continua alcançável
 * pelo badge da aba; favoritas continuam marcadas com a estrela na
 * linha. Nenhuma funcionalidade perdida, só a navegação principal
 * passou a ser por assunto, como no design.
 */
type FiltroCategoria = "todas" | "viagem" | "aluno" | "seguranca" | "pagamentos";

const FILTROS: { value: FiltroCategoria; label: string; icon: LucideIcon }[] = [
  { value: "todas", label: "Todas", icon: LayoutGrid },
  { value: "viagem", label: "Viagem", icon: Bus },
  { value: "aluno", label: "Aluno", icon: Backpack },
  { value: "seguranca", label: "Segurança", icon: ShieldCheck },
  { value: "pagamentos", label: "Pagamentos", icon: CreditCard },
];

/**
 * Quais `NotificationEventType` caem em cada categoria da referência.
 * A API filtra por UM tipo só (`ListNotificationsParams.tipo`) e cada
 * categoria agrupa vários, então o filtro é aplicado no cliente sobre a
 * lista já carregada — nunca várias requisições em paralelo por
 * categoria (N+1 à toa numa tela que já carrega tudo de uma vez).
 */
const CATEGORIA_POR_TIPO: Record<NotificationEventType, Exclude<FiltroCategoria, "todas">> = {
  VIAGEM_INICIADA: "viagem",
  VIAGEM_ENCERRADA: "viagem",
  VEICULO_PROXIMO: "viagem",
  ROTA_ALTERADA: "viagem",
  MOTORISTA_ALTERADO: "viagem",
  MONITOR_ALTERADO: "viagem",
  VEICULO_ALTERADO: "viagem",
  ALUNO_EMBARCOU: "aluno",
  ALUNO_DESEMBARCOU: "aluno",
  ALUNO_AUSENTE: "aluno",
  NOVO_ALUNO: "aluno",
  NOVO_RESPONSAVEL: "aluno",
  NOVA_ESCOLA: "aluno",
  OCORRENCIA: "seguranca",
  EMERGENCIA: "seguranca",
  CNH_VENCENDO: "seguranca",
  DOCUMENTO_VENCENDO: "seguranca",
  PAGAMENTO_APROVADO: "pagamentos",
  PAGAMENTO_RECUSADO: "pagamentos",
  PAGAMENTO_PENDENTE: "pagamentos",
  NOVO_CONTRATO: "pagamentos",
  CONTRATO_ASSINADO: "pagamentos",
  // Avisos por cargo (15/09/2026). Os três operacionais entram em
  // "Viagem" porque é o que eles mudam — o dia de quem dirige. A
  // solicitação nova vai pra "Pagamentos" junto de contrato: é o mesmo
  // funil comercial, do primeiro contato até o dinheiro entrar.
  ALUNO_NAO_VAI_HOJE: "aluno",
  ENDERECO_DO_DIA_ALTERADO: "viagem",
  ESCALA_ALTERADA: "viagem",
  NOVA_SOLICITACAO_TRANSPORTE: "pagamentos",
};

/**
 * Hora do dia (`07:05`) pra hoje, relativo pra antes — a referência
 * mostra só o horário à direita de cada linha porque todos os exemplos
 * dela são do mesmo dia; uma notificação de semanas atrás com "07:05"
 * solto seria enganosa.
 */
function carimboDeTempo(createdAt: string): string {
  const data = new Date(createdAt);
  const agora = new Date();
  const mesmoDia =
    data.getFullYear() === agora.getFullYear() &&
    data.getMonth() === agora.getMonth() &&
    data.getDate() === agora.getDate();

  if (mesmoDia) {
    return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const diffDias = Math.floor((agora.getTime() - data.getTime()) / 86400000);
  if (diffDias < 7) return `há ${diffDias}d`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const MENSAGEM_VAZIA: Record<FiltroCategoria, string> = {
  todas: "Nenhuma notificação recebida ainda.",
  viagem: "Nenhuma notificação de viagem.",
  aluno: "Nenhuma notificação sobre alunos.",
  seguranca: "Nenhuma notificação de segurança.",
  pagamentos: "Nenhuma notificação de pagamento.",
};

/**
 * Central de Notificações Internas (Dossiê 11 §4.4) — lista todas as
 * notificações recebidas pelo usuário autenticado (independente do
 * canal efetivo de envio: push/WhatsApp/SMS/e-mail sempre deixam um
 * registro aqui). Arquivadas ficam fora desta lista (`Historico`).
 * Acesso às preferências de canal a partir do cabeçalho (mesmo local
 * descrito no Dossiê).
 *
 * Layout alinhado à tela 12 da referência (15/09/2026 — usuário
 * cobrando "e o design da interface que não mudou?"): filtros por
 * categoria, "Marcar todas como lidas" como link à direita (era um
 * botão largo centralizado), e as notificações como LINHAS dentro de
 * um cartão único com divisórias — antes cada uma era um cartão
 * separado com um selo de prioridade em caixa alta ("INFORMATIVA"),
 * que não existe na referência. A prioridade continua no detalhe
 * (`DetalhesScreen`), onde tem espaço pra significar alguma coisa.
 */
export function CentralScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [filtro, setFiltro] = useState<FiltroCategoria>("todas");
  const { data, isLoading, isError, refetch } = useNotificationsList({ arquivada: false });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const itens = useMemo(() => {
    const todos = data?.items ?? [];
    if (filtro === "todas") return todos;
    return todos.filter((n) => CATEGORIA_POR_TIPO[n.tipo] === filtro);
  }, [data?.items, filtro]);

  const filtros = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.filtrosRow, { gap: theme.spacing[2] }]}
    >
      {FILTROS.map((option) => {
        const ativo = filtro === option.value;
        const FiltroIcone = option.icon;
        return (
          <Pressable
            key={option.value}
            onPress={() => setFiltro(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            style={styles.filtroItem}
          >
            <View
              style={[
                styles.filtroQuadrado,
                {
                  backgroundColor: ativo ? theme.colors.primary : theme.colors.surface,
                  borderColor: ativo ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              <FiltroIcone
                size={20}
                color={ativo ? theme.colors.background : theme.colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.filtroLabel,
                { color: ativo ? theme.colors.primary : theme.colors.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  function handleAbrir(notificationId: string, lida: boolean): void {
    if (!lida) markRead.mutate(notificationId);
    navigation.navigate("Detalhes", { notificationId });
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        {filtros}
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar suas notificações. Tente novamente mais tarde.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {/* Ordem da referência (tela "NOTIFICAÇÕES - RESPONSÁVEL"): o link
          "Marcar todas como lidas" fica ACIMA do título, alinhado à
          direita — depois o título, depois a faixa de filtros. */}
      <View style={styles.acoesRow}>
        <Pressable
          onPress={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          accessibilityRole="button"
        >
          <Text style={[styles.acaoLink, { color: theme.colors.primary }]}>
            Marcar todas como lidas
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.tituloTela, { color: theme.colors.text }]}>Notificações</Text>

      {filtros}

      {itens.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>{MENSAGEM_VAZIA[filtro]}</Text>
      ) : (
        <VehicleCard style={styles.lista}>
          {itens.map((notification, index) => {
            const TipoIcone = NOTIFICATION_TYPE_ICON[notification.tipo];
            const corTipo = resolveToneColor(theme, NOTIFICATION_TYPE_TONE[notification.tipo]);
            return (
              <Pressable
                key={notification.id}
                onPress={() => handleAbrir(notification.id, notification.lida)}
                style={[
                  styles.linha,
                  index > 0
                    ? {
                        borderTopColor: theme.colors.border,
                        borderTopWidth: StyleSheet.hairlineWidth,
                      }
                    : null,
                ]}
              >
                <View style={[styles.iconeCirculo, { backgroundColor: `${corTipo}26` }]}>
                  <TipoIcone size={18} color={corTipo} />
                </View>

                <View style={styles.linhaTexto}>
                  <Text
                    style={[
                      styles.titulo,
                      { color: theme.colors.text, fontWeight: notification.lida ? "600" : "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {notification.titulo}
                  </Text>
                  <Text style={[styles.corpo, { color: theme.colors.textMuted }]} numberOfLines={2}>
                    {notification.corpo}
                  </Text>
                </View>

                <View style={styles.linhaMeta}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {carimboDeTempo(notification.createdAt)}
                  </Text>
                  <View style={styles.linhaMetaIcones}>
                    {notification.favoritada ? (
                      <Star
                        size={12}
                        color={theme.colors.textMuted}
                        fill={theme.colors.textMuted}
                      />
                    ) : null}
                    {!notification.lida ? (
                      <View
                        style={[styles.pontoNaoLida, { backgroundColor: theme.colors.primary }]}
                      />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </VehicleCard>
      )}

      <VehicleButton
        label="Ver notificações arquivadas"
        variant="ghost"
        onPress={() => navigation.navigate("Historico")}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  acaoLink: { fontSize: 13, fontWeight: "600" },
  acoesRow: { alignItems: "flex-end" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  corpo: { fontSize: 13, lineHeight: 18 },
  filtroItem: { alignItems: "center", gap: 6, width: 68 },
  filtroLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  filtroQuadrado: {
    alignItems: "center",
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  filtrosRow: { flexDirection: "row", paddingRight: 4 },
  iconeCirculo: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  linha: { alignItems: "flex-start", flexDirection: "row", gap: 12, paddingVertical: 12 },
  linhaMeta: { alignItems: "flex-end", gap: 6 },
  linhaMetaIcones: { alignItems: "center", flexDirection: "row", gap: 4 },
  linhaTexto: { flex: 1, gap: 2 },
  lista: { gap: 0, paddingVertical: 0 },
  pontoNaoLida: { borderRadius: 4, height: 8, width: 8 },
  titulo: { fontSize: 15 },
  tituloTela: { fontSize: 22, fontWeight: "700" },
});
