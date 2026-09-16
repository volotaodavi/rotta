import { useAuth } from "@rotta/auth/native";
import { Bus, LifeBuoy, LogOut, School, ShieldCheck } from "@rotta/icons/native";
import { View, StyleSheet, Text, Pressable } from "react-native";

import { SCHOOL_SHIFT_LABEL } from "../../schools/labels";

import type { ParentPerfilStackParamList, ParentTabParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PinSetupCard } from "@/features/auth/components";
import { useStudentsList } from "@/features/marketplace/hooks/use-students";
import {
  DadoLinha,
  DadosCard,
  SeloVerificado,
  useVerificacaoResponsavel,
  VerificacaoCard,
} from "@/features/perfil";
import {
  MenuRowList,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
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
 *
 * "Meus filhos" (Frente 2, 11/09/2026) deixou de ser só leitura — cada
 * linha agora navega pro detalhe/edição completo (`AlunoDetalhe`), e o
 * card ganhou um atalho pra lista completa/cadastro (`Alunos`).
 *
 * "Escolas" (Frente 3, 11/09/2026) é um atalho direto pra navegação
 * livre entre as escolas dos alunos — o mesmo módulo também é
 * alcançável a partir do detalhe de cada aluno (`AlunoDetalhe`).
 */
export function ParentPerfilScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { data: alunos } = useStudentsList();
  const verificacao = useVerificacaoResponsavel();

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
            <View style={styles.nomeLinha}>
              <Text style={[styles.nome, { color: theme.colors.text }]}>{user?.nome}</Text>
              {verificacao.verificado ? <SeloVerificado /> : null}
            </View>
            <Text style={{ color: theme.colors.textMuted }}>Responsável</Text>
          </View>
        </View>
      </VehicleCard>

      {/* "Poderá ver TUDO oq foi preenchido" (pedido do usuário
          15/09/2026) — antes esta tela só mostrava e-mail e telefone, e
          só quando preenchidos; agora toda linha aparece sempre, e o que
          falta aparece como "Não informado" em vez de sumir. */}
      <DadosCard titulo="Meus dados">
        <DadoLinha rotulo="Nome" valor={user?.nome} />
        <DadoLinha rotulo="E-mail" valor={user?.email} />
        <DadoLinha rotulo="Telefone" valor={user?.telefone} />
        <DadoLinha rotulo="Perfil" valor="Responsável" />
        <DadoLinha rotulo="Alunos cadastrados" valor={String(alunos?.items.length ?? 0)} />
      </DadosCard>

      <VerificacaoCard verificacao={verificacao} />

      <VehicleCard>
        <Text style={[styles.secao, { color: theme.colors.text }]}>Meus filhos</Text>
        {alunos && alunos.items.length > 0
          ? alunos.items.map((aluno) => (
              <Pressable
                key={aluno.id}
                onPress={() => navigation.navigate("AlunoDetalhe", { studentId: aluno.id })}
              >
                <View style={styles.alunoLinha}>
                  <Text style={{ color: theme.colors.text }}>{aluno.nome}</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {SCHOOL_SHIFT_LABEL[aluno.turno]}
                  </Text>
                </View>
              </Pressable>
            ))
          : null}
        <VehicleButton
          label="Ver todos / adicionar aluno"
          variant="secondary"
          onPress={() => navigation.navigate("Alunos")}
        />
      </VehicleCard>

      {/* Pedido do usuário 05/09/2026: "tanto para responsável, quanto para
          monitor/motorista" — antes o Acesso rápido só existia no Perfil
          de Motorista/Monitor. */}
      <PinSetupCard />

      {/* Menu em linhas com ícone + seta, e "Sair" em vermelho
          (15/09/2026, referência "PERFIL - RESPONSÁVEL") — antes eram
          `VehicleButton` de largura total empilhados, com peso visual de
          botão de ação em cima de itens que são só navegação.
          "Meus dados", "Endereços" e "Métodos de pagamento" aparecem na
          referência mas não entram aqui: não existe tela pra eles no
          app (edição de conta segue exclusiva da Web) — linha de menu
          que não leva a lugar nenhum é pior que linha ausente. */}
      <MenuRowList
        items={[
          { icon: Bus, label: "Meu transporte", onPress: handleMeuTransporte },
          { icon: School, label: "Escolas", onPress: () => navigation.navigate("Escolas") },
          {
            icon: LifeBuoy,
            label: "Suporte",
            onPress: () => navigation.navigate("Chamados"),
          },
          {
            icon: ShieldCheck,
            label: "Privacidade e documentos",
            onPress: () => navigation.navigate("Documentacao"),
          },
          { icon: LogOut, label: "Sair", onPress: () => void logout(), destrutivo: true },
        ]}
      />
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
  avatarLabel: { fontSize: 20, fontWeight: "700" },
  header: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 4 },
  headerInfo: { flex: 1 },
  nome: { fontSize: 16, fontWeight: "700" },
  nomeLinha: { alignItems: "center", flexDirection: "row", gap: 6 },
  secao: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
});
