import { ImageBackground, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


import HERO_IMAGE from "../../../../assets/welcome-hero.png";
import { AuthButton } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getHasSeenOnboarding } from "@/lib/onboarding-store";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "Entrada">;

/**
 * Tela inicial do app (Dossiê 15/24, `AUTH-01`) — pedido do usuário
 * 01/09/2026: a arte de boas-vindas (van + rota + wordmark Rotta) é o
 * PRIMEIRO que qualquer pessoa vê ao abrir o app, seja na primeira
 * instalação ou numa visita recorrente (`RootNavigator` sempre usa
 * `Entrada` como rota inicial, sem depender de `getHasSeenOnboarding()`
 * pra decidir a tela — só o botão "Começar agora" consulta esse flag,
 * ver `handleComecar` abaixo).
 *
 * Dois botões sobre a imagem, exatamente como pedido: "Começar agora"
 * (quem nunca usou — primeiro passa pelo carrossel de 3 telas já
 * existente, `OnboardingScreen`, só na primeira vez; depois vai direto
 * pra `SelecionarPerfil`, a tela que reúne cadastro por papel E "Já
 * tenho conta") e "Entrar" (quem já tem conta, direto pro login —
 * login é único e independente de papel).
 */
export function EntradaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  async function handleComecar(): Promise<void> {
    const jaViu = await getHasSeenOnboarding().catch(() => true);
    navigation.navigate(jaViu ? "SelecionarPerfil" : "Onboarding");
  }

  return (
    <ImageBackground source={HERO_IMAGE} style={styles.flex} resizeMode="cover">
      <View
        style={[
          styles.actions,
          {
            paddingBottom: insets.bottom + theme.spacing[8],
            paddingHorizontal: theme.spacing[6],
            gap: theme.spacing[3],
          },
        ]}
      >
        <AuthButton label="Começar agora" onPress={() => void handleComecar()} />
        <AuthButton
          label="Entrar"
          variant="secondary"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  actions: { flex: 1, justifyContent: "flex-end" },
  flex: { flex: 1 },
});
