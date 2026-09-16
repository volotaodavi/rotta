import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@rotta/auth/native";
import { Bell, Bus, CreditCard, LifeBuoy, LogOut, Users, Zap } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";

import { useMyCompany } from "../hooks/use-empresa-company";

import type { EmpresaTabParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import {
  DadoLinha,
  DadosCard,
  SeloVerificado,
  useVerificacaoEmpresa,
  VerificacaoCard,
} from "@/features/perfil";
import { MenuRowList, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useAppModeContext } from "@/providers/app-mode-provider";
import { useTheme } from "@/providers/theme-provider";

/** Iniciais do nome pro avatar (sem foto de perfil no produto ainda — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Perfil da Empresa/Gestor no app (pedido do usuário 11/09/2026) —
 * avatar (iniciais), dados da conta, nome da transportadora e sair.
 * Mesmo modelo de `admin-perfil-screen.tsx`, trocando o sub-papel
 * (`adminPapel`) pelo `companyName`. Sem edição de conta/empresa aqui
 * — isso continua exclusivo da Web (`/empresa`).
 *
 * "Modo Ação" (Frente 6, 11/09/2026 — pedido do usuário: "Motorista
 * (autônomo/MEI) - Tudo oq o motorista anterior tem + financeiro +
 * alunos + perfil + escolas + veículos") — só o dono autônomo/MEI
 * (`canToggle`, mesma regra de `apps/web/.../use-app-mode.ts`) vê o
 * botão pra alternar; Empresa LTDA/SA/Cooperativa/Sociedade Simples e
 * Gestor nunca veem, sempre ficam só na Visão completa.
 *
 * Menu de atalhos (achado 15/09/2026 comparando contra a tela 31 da
 * referência, "Perfil - Gestor") — antes só tinha "Entrar no Modo
 * Ação"/"Sair", enquanto o Perfil de todo outro papel (Responsável,
 * Motorista) tem uma lista de atalhos.
 *
 * "Financeiro" da referência virou "Assinatura" (o que o transportador
 * realmente paga à Rotta) e "Suporte" abre os chamados, que já existiam
 * como tela e só não tinham navegação por aqui — o backend já libera
 * `Role.EMPRESA`/`Role.GESTOR` nesse módulo.
 *
 * "Dados da empresa" e "Documentos" continuam fora: editar a empresa
 * segue exclusivo da Web, e documento de empresa não existe no produto
 * (o que existe é documento de VEÍCULO, que vive dentro da Frota).
 * Linha de menu que não leva a lugar nenhum é pior que linha ausente.
 */
export function EmpresaPerfilScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { canToggle, setMode } = useAppModeContext();
  const navigation = useNavigation<BottomTabNavigationProp<EmpresaTabParamList>>();
  const verificacao = useVerificacaoEmpresa();
  const { data: empresa } = useMyCompany(user?.companyId);

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
            {user?.companyName ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {user.companyName}
              </Text>
            ) : null}
          </View>
        </View>
      </VehicleCard>

      {/* "Poderá ver TUDO oq foi preenchido" (pedido do usuário
          15/09/2026) — conta + transportadora na mesma tela. Continua
          SÓ LEITURA: editar empresa segue exclusivo do Painel Web (ver
          comentário do cabeçalho), então nenhuma linha aqui é um campo. */}
      <DadosCard titulo="Meus dados">
        <DadoLinha rotulo="Nome" valor={user?.nome} />
        <DadoLinha rotulo="E-mail" valor={user?.email} />
        <DadoLinha rotulo="Telefone" valor={user?.telefone} />
        <DadoLinha rotulo="Perfil" valor={user?.role === "gestor" ? "Gestor(a)" : "Empresa"} />
      </DadosCard>

      <DadosCard titulo="Transportadora">
        <DadoLinha rotulo="Nome fantasia" valor={empresa?.nomeFantasia ?? user?.companyName} />
        <DadoLinha rotulo="Razão social" valor={empresa?.razaoSocial} />
        <DadoLinha rotulo="CNPJ/CPF" valor={empresa?.cpfCnpj} />
        <DadoLinha rotulo="Código Rotta" valor={empresa?.codigoInterno} />
        <DadoLinha rotulo="E-mail" valor={empresa?.email} />
        <DadoLinha rotulo="Telefone" valor={empresa?.telefone} />
        <DadoLinha
          rotulo="Endereço"
          valor={
            empresa
              ? `${empresa.endereco}, ${empresa.numero} · ${empresa.bairro}, ${empresa.cidade}/${empresa.estado}`
              : null
          }
        />
      </DadosCard>

      <VerificacaoCard verificacao={verificacao} />

      {/* Menu em linhas com ícone + seta e "Sair" em vermelho
          (referência "PERFIL - GESTOR") — mesmo componente dos outros
          Perfis. "Modo Ação" (Frente 6) só aparece pro dono
          autônomo/MEI: troca pro MESMO `DriverNavigator` do
          Motorista/Monitor, com Financeiro (Rotta Pay) e Escolas já
          reativados pra este papel. */}
      <MenuRowList
        items={[
          { icon: Bus, label: "Veículos", onPress: () => navigation.navigate("Frota") },
          {
            icon: Users,
            label: "Motoristas",
            onPress: () => navigation.navigate("Inicio", { screen: "Equipe" }),
          },
          { icon: Bell, label: "Notificações", onPress: () => navigation.navigate("Notificacoes") },
          {
            icon: CreditCard,
            label: "Assinatura",
            onPress: () => navigation.navigate("Inicio", { screen: "Assinatura" }),
          },
          {
            icon: LifeBuoy,
            label: "Suporte",
            onPress: () => navigation.navigate("Inicio", { screen: "Chamados" }),
          },
          ...(canToggle
            ? [{ icon: Zap, label: "Entrar no Modo Ação", onPress: () => setMode("acao") }]
            : []),
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
  avatarLabel: { fontSize: 20, fontWeight: "700" },
  header: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 4 },
  headerInfo: { flex: 1, gap: 4 },
  nome: { fontSize: 16, fontWeight: "700" },
  nomeLinha: { alignItems: "center", flexDirection: "row", gap: 6 },
});
