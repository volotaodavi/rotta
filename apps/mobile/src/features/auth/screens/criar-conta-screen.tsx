import { AuthButton, AuthHeaderScreen } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<AuthStackParamList, "CriarConta">;

/**
 * "Como deseja utilizar a Rotta?" (Dossiê 15, `AUTH-01`) — Área
 * Profissional (Empresas/MEIs/Autônomos) ou Área Pessoal (Responsável).
 *
 * Redesign 15/09/2026 — ver nota em `login-screen.tsx`.
 */
export function CriarContaScreen({ navigation }: Props): JSX.Element {
  return (
    <AuthHeaderScreen
      title="Como deseja usar a Rotta?"
      subtitle="Escolha a opção que combina com você."
      onBack={() => navigation.goBack()}
    >
      <AuthButton
        label="Área Profissional"
        onPress={() => navigation.navigate("AreaProfissional")}
      />
      <AuthButton
        label="Área Pessoal"
        variant="secondary"
        onPress={() => navigation.navigate("AreaPessoal")}
      />
    </AuthHeaderScreen>
  );
}
