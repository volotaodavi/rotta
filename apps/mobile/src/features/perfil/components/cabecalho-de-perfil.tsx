import { StyleSheet, View } from "react-native";

import type { ReactNode } from "react";

import { Texto } from "@/components/texto";
import { useTheme } from "@/providers/theme-provider";

/** Iniciais do nome para o avatar: o produto não tem foto de perfil, e nunca inventa uma. */
export function iniciaisDoNome(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * O topo do Perfil: avatar, nome e papel.
 *
 * ## Por que virou um componente só
 *
 * Porque era o mesmo bloco copiado em cinco telas (Responsável,
 * Motorista, Monitor, Gestor e Admin), cada uma com a sua cópia do
 * avatar, do tamanho do nome e do espaçamento. Cinco cópias de um bloco
 * idêntico é a garantia de que, na primeira mudança, eles passam a ser
 * cinco blocos diferentes.
 *
 * ## Fora do cartão, de propósito
 *
 * No conceito que o fundador aprovou em 16/10/2026, o nome e o avatar
 * ficam soltos sobre o fundo da tela, e só os atalhos abaixo são
 * cartões. Colocar o cabeçalho dentro de um cartão, como estava, dava
 * três caixas empilhadas antes do primeiro atalho e fazia o Perfil
 * parecer um formulário.
 *
 * `acento` existe para o Motorista e o Monitor: as telas deles usam a
 * paleta própria do Modo Operacional (azul do Motorista, roxo do
 * Monitor), e o avatar segue o papel. Sem isso, o Monitor teria um
 * avatar azul numa tela roxa.
 */
export interface CabecalhoDePerfilProps {
  nome: string | undefined;
  papel: string;
  /** Selo de verificação ou outro enfeite ao lado do nome. */
  selo?: ReactNode;
  /** Cor do avatar, para os papéis com identidade própria. */
  acento?: { cor: string; fundo: string };
}

export function CabecalhoDePerfil({
  nome,
  papel,
  selo,
  acento,
}: CabecalhoDePerfilProps): JSX.Element {
  const { theme } = useTheme();
  const cor = acento?.cor ?? theme.colors.primary;
  const fundo = acento?.fundo ?? theme.colors.primaryMuted;

  return (
    <View style={styles.linha}>
      <View style={[styles.avatar, { backgroundColor: fundo, borderRadius: theme.radius.full }]}>
        <Texto style={[styles.iniciais, { color: cor }]}>{iniciaisDoNome(nome)}</Texto>
      </View>

      <View style={styles.textos}>
        <View style={styles.nomeLinha}>
          <Texto numberOfLines={1} style={[styles.nome, { color: theme.colors.text }]}>
            {nome ?? "Sem nome"}
          </Texto>
          {selo}
        </View>
        <Texto style={[styles.papel, { color: theme.colors.textMuted }]}>{papel}</Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  iniciais: { fontSize: 22, fontWeight: "700" },
  linha: { alignItems: "center", flexDirection: "row", gap: 14, paddingVertical: 4 },
  nome: { flexShrink: 1, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  nomeLinha: { alignItems: "center", flexDirection: "row", gap: 8 },
  papel: { fontSize: 14, marginTop: 2 },
  textos: { flex: 1, minWidth: 0 },
});
