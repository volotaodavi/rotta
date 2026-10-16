import { useAuth } from "@rotta/auth/native";
import { Bus, GraduationCap, ShoppingBag, Users } from "@rotta/icons/native";
import { Pressable, StyleSheet, View } from "react-native";

import { TrialBanner } from "../components";
import { useMyCompany } from "../hooks/use-empresa-company";
import { useStudentsTotal } from "../hooks/use-empresa-dashboard";
import { useTransportRequestsList } from "../hooks/use-empresa-marketplace";
import { useRoutesList } from "../hooks/use-empresa-routes";
import { useMyTeam, usePendingJoinRequests } from "../hooks/use-empresa-team";
import { useVehiclesList } from "../hooks/use-empresa-vehicles";

import type { EmpresaHomeStackParamList, EmpresaTabParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComponentType } from "react";

import { Texto } from "@/components/texto";
import { ROUTE_STATUS_LABEL, ROUTE_STATUS_TONE } from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaHomeStackParamList, "Dashboard">;

/**
 * Início da área Empresa/Gestor reduzida no app (pedido do usuário
 * 11/09/2026: "veja oq tem na web e traga para o app oficial" — versão
 * reduzida confirmada). Atalhos pra "Alunos" (Frente 2) e "Equipe"
 * (Frente 5, aninhada na mesma aba — ver `EmpresaTabParamList`); o de
 * Equipe mostra a contagem de pedidos pendentes, mesmo dado do
 * `tabBarBadge` da aba Início (`EmpresaNavigator`).
 *
 * "Solicitações"/"Contratos" (Frente A, 12/09/2026 — pedido do usuário:
 * "o app é o principal... traga o que tem na Web pro app") — antes
 * desta Frente o app não tinha NENHUMA tela de Marketplace; uma
 * solicitação de família só era vista abrindo a Web. O atalho de
 * Solicitações mostra a contagem de `RECEBIDA` (ainda sem decisão),
 * mesmo raciocínio do badge de Equipe.
 *
 * Resumo (Veículos/Alunos/Motoristas) + "Rotas ativas" (redesign
 * 15/09/2026 — pedido do usuário: print real da Rotta anexado mostra
 * um resumo de 3 números + lista de rotas em andamento na Home do
 * Gestor, que esta tela não tinha; "faça oq deve estar no app"). Só
 * "Motoristas" conta (não Monitores/Gestores) — mesmo recorte do print.
 * "Rotas ativas" usa `RouteStatus === "ATIVA"` (não um estado de
 * viagem-agora-em-curso: isso exigiria consultar a viagem de hoje de
 * cada rota uma por uma, N+1 que nem a própria Web faz na listagem de
 * rotas) — nunca um número inventado. Toca numa rota leva pra aba
 * Rotas (não pro detalhe direto: `EmpresaTabParamList.Rotas` ainda não
 * tipa parâmetros aninhados, mudança maior de escopo pra outro dia).
 */
export function EmpresaHomeScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: company } = useMyCompany(user?.companyId);
  // Habilitações da empresa (25/09/2026) — `undefined` enquanto carrega,
  // e nesse estado os atalhos do Marketplace continuam visíveis.
  const temTagParticular = company ? company.tags.includes("PRIVADA") : undefined;
  const { data: pendentes } = usePendingJoinRequests();
  // Só o total importa aqui (badge do atalho) — `pageSize: 1` evita
  // carregar a lista inteira só pra saber a contagem.
  const { data: solicitacoesRecebidas } = useTransportRequestsList({
    status: "RECEBIDA",
    pageSize: 1,
  });

  const { data: veiculos } = useVehiclesList({ pageSize: 1 });
  const { data: alunosTotal } = useStudentsTotal();
  const { data: equipe } = useMyTeam();
  const motoristasCount = equipe?.filter((membro) => membro.papel === "motorista").length;
  const { data: rotasAtivas } = useRoutesList({ status: "ATIVA", pageSize: 5 });

  function irParaAba(aba: keyof EmpresaTabParamList): void {
    navigation.getParent<BottomTabNavigationProp<EmpresaTabParamList>>()?.navigate(aba);
  }

  return (
    <VehicleScreen>
      {/*
        O cartão azul escuro da tela 28 do conceito: a saudação e o
        resumo da operação na mesma peça, em branco sobre o azul da
        marca. Antes eram duas coisas separadas, uma saudação solta e um
        cartão branco de números, e nenhuma das duas dizia que aquele é
        o painel da empresa.
      */}
      <View
        style={[
          styles.painel,
          {
            backgroundColor: theme.colors.brandDeep,
            borderRadius: theme.radius.lg,
            padding: theme.spacing[4],
          },
        ]}
      >
        <Texto style={[styles.saudacao, { color: theme.colors.onPrimary }]} numberOfLines={1}>
          Olá, {user?.nome}
        </Texto>
        {user?.companyName ? (
          <Texto style={{ color: theme.colors.onBrandMuted, fontSize: 12 }} numberOfLines={1}>
            {user.companyName}
          </Texto>
        ) : null}

        <Texto style={[styles.resumoRotulo, { color: theme.colors.onBrandMuted }]}>
          Resumo da operação
        </Texto>
        <View style={styles.statsRow}>
          <StatTile valor={veiculos?.total} label="Veículos" onPress={() => irParaAba("Frota")} />
          <StatTile
            valor={alunosTotal}
            label="Alunos"
            onPress={() => navigation.navigate("AlunosPreCadastro")}
          />
          <StatTile
            valor={motoristasCount}
            label="Motoristas"
            onPress={() => navigation.navigate("Equipe")}
          />
        </View>
      </View>

      {company ? <TrialBanner company={company} /> : null}

      {rotasAtivas && rotasAtivas.items.length > 0 ? (
        <View style={styles.rotasSection}>
          <View style={styles.rotasHeader}>
            <Texto style={[styles.secao, { color: theme.colors.text }]}>Rotas ativas</Texto>
            <Pressable onPress={() => irParaAba("Rotas")} accessibilityRole="button">
              <Texto style={{ color: theme.colors.primary, fontSize: 14, fontWeight: "600" }}>
                Ver todas
              </Texto>
            </Pressable>
          </View>
          {rotasAtivas.items.map((rota) => (
            <Pressable key={rota.id} onPress={() => irParaAba("Rotas")}>
              <VehicleCard style={styles.rotaCard}>
                <Texto style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>
                  {rota.nome}
                </Texto>
                <View style={styles.rotaCardFooter}>
                  <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {SCHOOL_SHIFT_LABEL[rota.turno]}
                  </Texto>
                  <StatusPill
                    label={ROUTE_STATUS_LABEL[rota.status]}
                    tone={ROUTE_STATUS_TONE[rota.status]}
                  />
                </View>
              </VehicleCard>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Marketplace é da vertente PARTICULAR (25/09/2026): é a família
          procurando e contratando a transportadora. Numa empresa só
          licitada quem define quem ela atende é o contrato com o
          município — os dois atalhos levariam a telas vazias, e a
          solicitação seria recusada pelo backend.

          `!== false` e não `=== true`: enquanto a empresa não carregou,
          os atalhos continuam aparecendo. Um botão que pisca é pior que
          um botão que abre uma tela vazia. */}
      {temTagParticular !== false ? (
        <>
          <VehicleButton
            label={
              solicitacoesRecebidas && solicitacoesRecebidas.total > 0
                ? `Solicitações (${solicitacoesRecebidas.total} novas)`
                : "Solicitações de transporte"
            }
            variant="secondary"
            icon={<ShoppingBag size={18} color={theme.colors.text} />}
            onPress={() => navigation.navigate("MarketplaceSolicitacoes")}
          />
          <VehicleButton
            label="Contratos"
            variant="secondary"
            icon={<ShoppingBag size={18} color={theme.colors.text} />}
            onPress={() => navigation.navigate("MarketplaceContratos")}
          />
        </>
      ) : null}
      <VehicleButton
        label={
          pendentes && pendentes.length > 0 ? `Equipe (${pendentes.length} pendentes)` : "Equipe"
        }
        variant="secondary"
        icon={<Users size={18} color={theme.colors.text} />}
        onPress={() => navigation.navigate("Equipe")}
      />
    </VehicleScreen>
  );
}

/**
 * Um número do resumo (Veículos/Alunos/Motoristas) — `valor` `undefined`
 * enquanto carrega mostra "—", nunca um placeholder de número inventado.
 */
/**
 * Um número do resumo, desenhado sobre o azul do painel.
 *
 * Sem ícone: no conceito os três números aparecem limpos, e o ícone de
 * cada um repetia o que o rótulo já diz. `-` quando o dado ainda não
 * chegou, nunca zero: zero é um número que o gestor acredita.
 */
function StatTile({
  valor,
  label,
  onPress,
}: {
  valor: number | undefined;
  label: string;
  onPress: () => void;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${valor ?? "sem dado"}`}
      style={styles.statTile}
    >
      <Texto style={[styles.statValor, { color: theme.colors.onPrimary }]}>{valor ?? "-"}</Texto>
      <Texto style={{ color: theme.colors.onBrandMuted, fontSize: 11 }}>{label}</Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  painel: { gap: 2 },
  resumoRotulo: { fontSize: 11, fontWeight: "600", marginTop: 14 },
  rotaCard: { gap: 6 },
  rotaCardFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rotasHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rotasSection: { gap: 8 },
  saudacao: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  secao: { fontSize: 16, fontWeight: "700" },
  statTile: { alignItems: "flex-start", flex: 1, gap: 2 },
  statValor: { fontSize: 24, fontVariant: ["tabular-nums"], fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
});
