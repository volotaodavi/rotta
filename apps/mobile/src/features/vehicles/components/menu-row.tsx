import { ChevronRight } from "@rotta/icons/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { VehicleCard } from "./vehicle-card";

import type { ComponentType } from "react";

import { useTheme } from "@/providers/theme-provider";

export interface MenuRowItem {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  /** Ação destrutiva/de saída ("Sair") — vermelha e sem seta, como na referência. */
  destrutivo?: boolean;
}

/**
 * Lista de itens de menu do Perfil — ícone + rótulo + seta, dentro de um
 * cartão único com divisórias (15/09/2026, referência visual do
 * usuário: telas "PERFIL - RESPONSÁVEL"/"PERFIL - MOTORISTA"/"PERFIL -
 * GESTOR", todas com o mesmo padrão).
 *
 * Antes cada Perfil empilhava `VehicleButton` de largura total, um por
 * atalho: mesma navegação, mas com peso visual de botão de ação em
 * cima de itens que são só navegação — e sem o "Sair" destacado em
 * vermelho que a referência mostra em todos os três papéis.
 *
 * Um componente só pros três Perfis de propósito: o padrão é idêntico
 * nas três telas da referência, então duplicar isso seria garantir que
 * eles divergissem na primeira alteração.
 */
export function MenuRowList({ items }: { items: MenuRowItem[] }): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleCard style={styles.lista}>
      {items.map((item, index) => {
        const Icone = item.icon;
        const cor = item.destrutivo ? theme.colors.danger : theme.colors.text;
        return (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            accessibilityRole="button"
            style={[
              styles.linha,
              index > 0
                ? {
                    borderTopColor: theme.colors.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  }
                : null,
            ]}
          >
            <Icone
              size={20}
              color={item.destrutivo ? theme.colors.danger : theme.colors.textMuted}
            />
            <Text style={[styles.label, { color: cor }]}>{item.label}</Text>
            {item.destrutivo ? null : <ChevronRight size={18} color={theme.colors.textMuted} />}
          </Pressable>
        );
      })}
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  label: { flex: 1, fontSize: 15 },
  linha: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 14 },
  lista: { gap: 0, paddingVertical: 0 },
});
