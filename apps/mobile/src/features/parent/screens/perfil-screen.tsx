import { useAuth } from "@rotta/auth/native";
import { View, StyleSheet, Text } from "react-native";

import { SCHOOL_SHIFT_LABEL } from "../../schools/labels";

import type { ParentPerfilStackParamList, ParentTabParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useStudentsList } from "@/features/marketplace/hooks/use-students";
import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<ParentPerfilStackParamList, "PerfilHome">;

/** Iniciais do nome pro avatar (sem foto de perfil no produto ainda — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Perfil do Responsável — avatar (iniciais), dados da conta, "Meus
 * filhos" (Frente Responsável, spec UX/UI 31/08/2026: "avatar + meus
 * filhos + meu transporte + menu") e sair. Antes um `PlaceholderScreen`
 * em `ParentNavigator.tsx`; "Documentação Rotta" (Dossiê 45) abre a
 * mesma Central de Documentação pública numa WebView, agora também
 * acessível pelo Responsável, não só por Motorista/Monitor (Dossiê 45,
 * Tarefa #199). "Meu transporte" leva pra aba "Viagens" — mesma fonte
 * de verdade de `useResponsavelTransportState`, nenhum resumo
 * duplicado aqui.
 */
export function ParentPerfilScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { data: alunos } = useStudentsList();

  function handleMeuTransporte(): void {
    navigation.getParent<BottomTabNavigationProp<ParentTabParamList>>()?.navigate("Transporte");
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryMuted }]}>
            <Text style={[styles.avatarLabel, { color: theme.colors.primary }]}>
              {iniciais(user?.nome)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.nome, { color: theme.colors.text }]}>{user?.nome}</Text>
            <Text style={{ color: theme.colors.textMuted }}>Responsável</Text>
          </View>
        </View>
        <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
        {user?.telefone ? (
          <Text style={{ color: theme.colors.textMuted }}>{user.telefone}</Text>
        ) : null}
      </VehicleCard>

      {alunos && alunos.items.length > 0 ? (
        <VehicleCard>
          <Text style={[styles.secao, { color: theme.colors.text }]}>Meus filhos</Text>
          {alunos.items.map((aluno) => (
            <View key={aluno.id} style={styles.alunoLinha}>
              <Text style={{ color: theme.colors.text }}>{aluno.nome}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {SCHOOL_SHIFT_LABEL[aluno.turno]}
              </Text>
            </View>
          ))}
        </VehicleCard>
      ) : null}

      <VehicleButton label="Meu transporte" variant="secondary" onPress={handleMeuTransporte} />
      <VehicleButton
        label="Chamados"
        variant="secondary"
        onPress={() => navigation.navigate("Chamados")}
      />
      <VehicleButton
        label="Documentação Rotta"
        variant="secondary"
        onPress={() => navigation.navigate("Documentacao")}
      />
      <VehicleButton label="Sair" variant="secondary" onPress={() => void logout()} />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  alunoLinha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  avatarLabel: { fontSize: 18, fontWeight: "700" },
  header: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 4 },
  headerInfo: { flex: 1 },
  nome: { fontSize: 16, fontWeight: "700" },
  secao: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
});
