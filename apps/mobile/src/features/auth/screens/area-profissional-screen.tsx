import { Building2, Car, Mail } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import { AuthScreen, RoleOptionCard } from "../components";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "AreaProfissional">;

/**
 * Área Profissional (Dossiê 15, `AUTH-01`).
 *
 * ## A palavra "autônomo" significava DUAS coisas, e isso prendia gente
 *
 * Correção de 01/10/2026, depois do relato: "AUTÔNOMO e MEI não precisa
 * de código da transportadora para entrar. Que loucura é essa?". Ele
 * está certo, e a arquitetura sempre disse isso — está escrita em
 * `apps/web/src/app/(auth)/criar-conta/motorista/page.tsx`: o
 * autônomo/MEI **é** a própria transportadora (`Company` com
 * `tipo: AUTONOMO`), mesmo cadastro de empresa.
 *
 * O que esta tela fazia era o oposto. O terceiro cartão dizia "Sou
 * motorista/monitor autônomo — Atue SEM VÍNCULO com uma transportadora"
 * e levava a `registerAutonomo`, que cria uma conta sem empresa e
 * BLOQUEIA o app até alguma transportadora aprovar um vínculo. A
 * descrição prometia exatamente o contrário do que acontecia, e o
 * autônomo de verdade — que deveria clicar em "Criar empresa" — caía
 * ali e ficava preso numa tela pedindo código.
 *
 * Agora os rótulos dizem a verdade: o primeiro cartão nomeia autônomo e
 * MEI (é onde eles devem entrar, sem código nenhum), e o terceiro diz o
 * que de fato é — motorista CONTRATADO que ainda não tem o convite em
 * mãos, e cuja conta fica esperando aprovação.
 *
 * Redesign 15/09/2026 — ver nota em `criar-conta-screen.tsx`.
 */
export function AreaProfissionalScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <AuthScreen>
      <View style={styles.headingBlock}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
          ]}
        >
          Área Profissional
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Empresas, MEIs e motoristas autônomos.
        </Text>
      </View>

      <RoleOptionCard
        icon={Building2}
        title="Sou transportadora, autônomo ou MEI"
        description="Você é a própria transportadora. Não precisa do código de ninguém."
        onPress={() => navigation.navigate("CriarEmpresaWebView")}
      />
      <RoleOptionCard
        icon={Mail}
        title="Já fui convidado por uma empresa"
        description="Use o código de convite que você recebeu."
        onPress={() => navigation.navigate("ConviteCodigo")}
      />
      <RoleOptionCard
        icon={Car}
        title="Trabalho para uma transportadora, mas não tenho convite"
        description="Sua conta fica aguardando a transportadora aprovar o vínculo."
        onPress={() => navigation.navigate("CriarContaAutonomo")}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  headingBlock: { gap: 4, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  title: { fontWeight: "700" },
});
