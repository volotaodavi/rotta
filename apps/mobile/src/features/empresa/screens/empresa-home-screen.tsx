import { useAuth } from "@rotta/auth/native";
import { GraduationCap } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import type { EmpresaHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaHomeStackParamList, "Dashboard">;

/**
 * Início da área Empresa/Gestor reduzida no app (pedido do usuário
 * 11/09/2026: "veja oq tem na web e traga para o app oficial" — versão
 * reduzida confirmada). Atalho pra "Alunos" entrou na Frente 2; o de
 * "Equipe" (aninhado na mesma aba, ver `EmpresaTabParamList`) entra na
 * Frente 5, quando a tela existir de verdade (mesmo cuidado do Admin:
 * sem botão morto apontando pra rota que ainda não existe).
 */
export function EmpresaHomeScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <VehicleScreen>
      <View>
        <Text style={[styles.saudacao, { color: theme.colors.text }]}>Olá, {user?.nome}</Text>
        {user?.companyName ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{user.companyName}</Text>
        ) : null}
      </View>
      <Text style={{ color: theme.colors.textMuted }}>
        Acompanhe sua frota e suas rotas por aqui. Mais áreas de gestão chegam em breve.
      </Text>

      <VehicleButton
        label="Alunos"
        variant="secondary"
        icon={<GraduationCap size={18} color={theme.colors.text} />}
        onPress={() => navigation.navigate("AlunosPreCadastro")}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  saudacao: { fontSize: 18, fontWeight: "700" },
});
