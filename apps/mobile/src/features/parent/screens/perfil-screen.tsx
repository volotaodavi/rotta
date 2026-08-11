import { useAuth } from "@rotta/auth/native";
import { StyleSheet, Text } from "react-native";

import type { ParentPerfilStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<ParentPerfilStackParamList, "PerfilHome">;

/**
 * Perfil do Responsável — nome, e-mail e sair (mesmo padrão mínimo de
 * `DriverPerfilScreen`, sem o PIN de acesso rápido — Dossiê 42 restringe
 * essa opção a `motorista`). Antes um `PlaceholderScreen` em
 * `ParentNavigator.tsx`; "Documentação Rotta" (Dossiê 45) abre a mesma
 * Central de Documentação pública numa WebView, agora também acessível
 * pelo Responsável, não só por Motorista/Monitor (Dossiê 45, Tarefa
 * #199).
 */
export function ParentPerfilScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <VehicleScreen>
      <VehicleCard>
        <Text style={[styles.nome, { color: theme.colors.text }]}>{user?.nome}</Text>
        <Text style={{ color: theme.colors.textMuted }}>Responsável</Text>
        <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
        {user?.telefone ? (
          <Text style={{ color: theme.colors.textMuted }}>{user.telefone}</Text>
        ) : null}
      </VehicleCard>

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
  nome: { fontSize: 16, fontWeight: "700" },
});
