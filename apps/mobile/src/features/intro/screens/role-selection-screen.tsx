import { Car, ClipboardCheck, Heart } from "@rotta/icons/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";


import { RoleOption } from "../components/role-option";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AuthButton, AuthScreen } from "@/features/auth/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "SelecionarPerfil">;

type Perfil = "responsavel" | "motorista" | "monitor";

const OPCOES: { id: Perfil; title: string; description: string; icon: typeof Heart }[] = [
  {
    id: "responsavel",
    title: "Responsável",
    description: "Para acompanhar o transporte do seu filho.",
    icon: Heart,
  },
  {
    id: "motorista",
    title: "Motorista",
    description: "Para conduzir e gerenciar suas viagens.",
    icon: Car,
  },
  {
    id: "monitor",
    title: "Monitor(a)",
    description: "Para acompanhar os alunos durante a rota.",
    icon: ClipboardCheck,
  },
];

/**
 * "Como você utiliza a Rotta?" (Seção 3) — vem depois do onboarding
 * (novo usuário) ou é alcançável a partir da tela `Entrada` (usuário
 * recorrente que quer criar uma NOVA conta). Login continua único e
 * independente de papel (`LoginScreen` já resolve isso pelo backend) —
 * esta tela só decide para onde o CADASTRO segue: Responsável cai em
 * `AreaPessoal`, Motorista/Monitor em `AreaProfissional` (que já cobre
 * "criar empresa", "fui convidado" e "sou autônomo" pros dois papéis —
 * nenhuma tela nova precisou ser criada para o cadastro em si).
 */
export function RoleSelectionScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [selecionado, setSelecionado] = useState<Perfil | null>(null);

  function handleContinuar(): void {
    if (!selecionado) return;
    if (selecionado === "responsavel") {
      navigation.navigate("AreaPessoal");
    } else {
      navigation.navigate("AreaProfissional");
    }
  }

  return (
    <AuthScreen>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
          ]}
        >
          Como você utiliza a Rotta?
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Escolha seu perfil para continuar.
        </Text>
      </View>

      <View style={styles.options} accessibilityRole="radiogroup">
        {OPCOES.map((opcao) => (
          <RoleOption
            key={opcao.id}
            icon={opcao.icon}
            title={opcao.title}
            description={opcao.description}
            selected={selecionado === opcao.id}
            onPress={() => setSelecionado(opcao.id)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <AuthButton label="Continuar" onPress={handleContinuar} disabled={!selecionado} />
        <AuthButton
          label="Já tenho conta"
          variant="ghost"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 4, marginTop: 8 },
  header: { gap: 4, marginBottom: 24 },
  options: { gap: 12 },
  subtitle: { fontSize: 14 },
  title: { fontWeight: "700" },
});
