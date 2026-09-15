import { useAuth } from "@rotta/auth/native";
import { Bus, IdCard, LayoutGrid, LifeBuoy, LogOut, ShieldCheck, Users } from "@rotta/icons/native";
import { driverShadow } from "@rotta/theme";
import { StyleSheet, Text, View } from "react-native";

import { PanelGreeting } from "../components";

import type { DriverPerfilStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PinSetupCard } from "@/features/auth/components";
import { MenuRowList, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useAppModeContext } from "@/providers/app-mode-provider";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<DriverPerfilStackParamList, "PerfilHome">;

const ROLE_LABEL: Record<string, string> = {
  motorista: "Motorista",
  monitor: "Monitor(a)",
  // Frente 6 — dono autônomo/MEI em "Modo Ação" chega nesta MESMA tela
  // (`DriverNavigator` reaproveitado), com `role === "empresa"`.
  empresa: "Motorista autônomo/MEI",
};

/** Iniciais do nome pro avatar (sem foto de perfil no produto ainda — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Perfil do Motorista/Monitor — avatar (iniciais, na identidade de
 * papel — `driverPrimary`/`monitorAccent`, mesma decisão de escopo de
 * `inicio-screen.tsx`), nome, papel, empresa e sair (mesmo padrão de
 * `painel-web-only-screen.tsx`, sem `window.confirm`/diálogo nativo). O
 * PIN de acesso rápido (Dossiê 42) só aparece para `motorista` — pedido
 * explícito do usuário ("caso os motoristas queiram"), Monitor não
 * ganha essa opção aqui. "Documentação Rotta" (Dossiê 45) abre a
 * Central de Documentação pública em uma WebView — disponível para os
 * dois papéis. "Meus Alunos" (Frente 4, 11/09/2026) também é dos dois
 * papéis — read-only, todas as rotas ativas da pessoa.
 *
 * Também é a tela de Perfil de quem está em "Modo Ação" (Frente 6 —
 * dono autônomo/MEI, `role === "empresa"`, mesmo `DriverNavigator`
 * reaproveitado sem nenhuma tela nova) — só essa pessoa vê o botão
 * "Voltar para Visão completa" (`canToggle`, `useAppModeContext`).
 */
export function DriverPerfilScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { canToggle, setMode } = useAppModeContext();
  const isMonitor = user?.role === "monitor";
  const accentColor = isMonitor ? theme.colors.monitorAccent : theme.colors.driverPrimary;
  const accentMuted = isMonitor ? theme.colors.monitorAccentMuted : theme.colors.driverPrimaryMuted;

  return (
    <VehicleScreen backgroundColor={theme.colors.driverBackground}>
      <PanelGreeting nome={user?.nome ?? ""} />

      <VehicleCard
        style={[
          styles.driverCard,
          { backgroundColor: theme.colors.surfaceElevated },
          driverShadow[theme.name].native,
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: accentMuted }]}>
            <Text style={[styles.avatarLabel, { color: accentColor }]}>{iniciais(user?.nome)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.nome, { color: theme.colors.text }]}>{user?.nome}</Text>
            <Text style={{ color: theme.colors.textMuted }}>
              {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
            </Text>
          </View>
        </View>
        {user?.companyName ? (
          <Text style={{ color: theme.colors.textMuted }}>{user.companyName}</Text>
        ) : null}
        <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
      </VehicleCard>

      {/* Pedido do usuário 05/09/2026: "tanto para responsável, quanto para
          monitor/motorista" — antes só `motorista` tinha esta opção, sem
          motivo pra excluir o Monitor (usa o mesmo app, o mesmo tipo de
          esquecimento de senha acontece com os dois papéis). Dono
          autônomo/MEI em "Modo Ação" (Frente 6) também ganha — dirige
          igual a um Motorista de verdade. */}
      {user?.role === "motorista" || user?.role === "monitor" || canToggle ? (
        <PinSetupCard />
      ) : null}

      {/* Menu em linhas com ícone + seta e "Sair" em vermelho
          (15/09/2026, referência "PERFIL - MOTORISTA") — antes eram
          `VehicleButton` de largura total empilhados, um por atalho.
          "Voltar para Visão completa" (Frente 6) só aparece pro dono
          autônomo/MEI; Motorista/Monitor FUNCIONÁRIO nunca tem
          `canToggle`. "Meu Veículo" está aqui (e não na barra de abas)
          desde a Frente AO, igual à versão web. */}
      <MenuRowList
        items={[
          ...(canToggle
            ? [
                {
                  icon: LayoutGrid,
                  label: "Voltar para Visão completa",
                  onPress: () => setMode("completo"),
                },
              ]
            : []),
          { icon: Bus, label: "Meu Veículo", onPress: () => navigation.navigate("Veiculo") },
          { icon: Users, label: "Meus Alunos", onPress: () => navigation.navigate("Alunos") },
          {
            icon: IdCard,
            label: "Verificar identidade",
            onPress: () => navigation.navigate("VerificacaoIdentidade"),
          },
          { icon: LifeBuoy, label: "Suporte", onPress: () => navigation.navigate("Chamados") },
          {
            icon: ShieldCheck,
            label: "Documentação Rotta",
            onPress: () => navigation.navigate("Documentacao"),
          },
          { icon: LogOut, label: "Sair", onPress: () => void logout(), destrutivo: true },
        ]}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  avatarLabel: { fontSize: 18, fontWeight: "700" },
  driverCard: { borderRadius: 24, borderWidth: 0 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 4 },
  headerInfo: { flex: 1 },
  nome: { fontSize: 16, fontWeight: "700" },
});
