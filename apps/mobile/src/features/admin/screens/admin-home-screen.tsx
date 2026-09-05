import { useAuth } from "@rotta/auth/native";
import { Building2, Bus, ClipboardCheck, GraduationCap, Headset, Route } from "@rotta/icons/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AdminStatTile } from "../components";
import { useAdminBackofficeDashboard } from "../hooks/use-admin-backoffice";
import { ADMIN_PAPEL_LABEL } from "../labels";

import type { AdminHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AdminHomeStackParamList, "Dashboard">;

/**
 * Início da área Admin reduzida no app (pedido do usuário 05/09/2026:
 * "área do admin no app, porém de forma reduzida... enquanto a web fica
 * completa") — mesmo dado de `apps/admin`'s home (`useBackofficeDashboard`,
 * Prompt 21/Dossiê 29), só que resumido em indicadores somente-leitura:
 * sem os gráficos/gestão completa que continuam exclusivos da Web.
 */
export function AdminHomeScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminBackofficeDashboard();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar o painel do Admin.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <View>
        <Text style={[styles.saudacao, { color: theme.colors.text }]}>Olá, {user?.nome}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          {user?.adminPapel ? ADMIN_PAPEL_LABEL[user.adminPapel] : "Admin Rotta"}
        </Text>
      </View>

      <View style={styles.grid}>
        <AdminStatTile
          icon={<Building2 size={18} color={theme.colors.primary} />}
          value={data.empresasTotal}
          label="Transportadoras"
        />
        <AdminStatTile
          icon={<Bus size={18} color={theme.colors.primary} />}
          value={data.veiculosTotal}
          label="Veículos"
        />
        <AdminStatTile
          icon={<GraduationCap size={18} color={theme.colors.primary} />}
          value={data.alunosTotal}
          label="Alunos"
        />
        <AdminStatTile
          icon={<Route size={18} color={theme.colors.primary} />}
          value={data.viagensHoje}
          label="Viagens hoje"
        />
        <AdminStatTile
          icon={<Headset size={18} color={theme.colors.primary} />}
          value={data.chamadosAbertos}
          label="Chamados abertos"
        />
        <AdminStatTile
          icon={<ClipboardCheck size={18} color={theme.colors.primary} />}
          value={data.aprovacoesPendentesTotal}
          label="Aprovações pendentes"
        />
      </View>

      <VehicleButton
        label="Ver fila de aprovações"
        variant="secondary"
        onPress={() => navigation.navigate("Aprovacoes")}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  saudacao: { fontSize: 18, fontWeight: "700" },
});
