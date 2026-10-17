import { fonteNativa } from "@rotta/theme";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Texto } from "../../atoms/Texto";

import type { Theme } from "@rotta/theme";

/**
 * FilterTabs — o grupo de filtros em pílula.
 *
 * "Hoje / Semana / Mês" nas viagens, "Todas / Viagem / Aluno /
 * Segurança / Pagamentos" nas notificações, "Todos 16 / Embarcados 12 /
 * Aguardando 3" na lista de alunos, "Faturas / Histórico" no
 * responsável. Quatro telas do conceito de 16/10/2026 usam o mesmo
 * elemento com contagem opcional ao lado do rótulo.
 *
 * ## Por que rola na horizontal
 *
 * Porque os rótulos são em português e crescem: "Aguardando" tem 10
 * caracteres, "Pagamentos" tem 10, e cinco deles não cabem numa tela de
 * 360 pontos. Espremer com `flex: 1` cortaria palavra; rolar mantém o
 * rótulo inteiro e deixa claro que há mais à direita.
 *
 * ## A contagem é dado, não enfeite
 *
 * Quem passa `count` passa o número real daquele filtro. Filtro que
 * mostra contagem errada, ou que mostra contagem quando não sabe, é
 * pior que filtro sem contagem: a pessoa toca em "Embarcados 12" e
 * encontra 9.
 */
export interface FilterTabOption {
  key: string;
  label: string;
  count?: number;
}

export interface FilterTabsProps {
  options: FilterTabOption[];
  value: string;
  onChange: (key: string) => void;
  theme: Theme;
}

export function FilterTabs({ options, value, onChange, theme }: FilterTabsProps): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.faixa, { gap: theme.spacing[2] }]}
    >
      {options.map((option) => {
        const ativo = option.key === value;

        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            accessibilityLabel={
              option.count === undefined ? option.label : `${option.label}, ${option.count}`
            }
            onPress={() => onChange(option.key)}
            style={[
              styles.pilula,
              {
                /*
                  Inativa é branca com borda, e não cinza preenchida:
                  no conceito as pílulas ficam sobre o fundo branco da
                  tela, e cinza sobre branco vira um bloco único que
                  esconde onde começa e termina cada opção.
                */
                backgroundColor: ativo ? theme.colors.primary : theme.colors.card,
                borderColor: ativo ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radius.full,
                borderWidth: 1,
                paddingHorizontal: theme.spacing[4],
              },
            ]}
          >
            <Texto
              numberOfLines={1}
              style={[
                styles.rotulo,
                { color: ativo ? theme.colors.onPrimary : theme.colors.textMuted },
              ]}
            >
              {option.label}
            </Texto>

            {option.count === undefined ? null : (
              <View
                style={[
                  styles.contagem,
                  {
                    backgroundColor: ativo ? theme.colors.onPrimary : theme.colors.surface,
                    borderRadius: theme.radius.full,
                  },
                ]}
              >
                <Texto
                  style={[
                    styles.numero,
                    { color: ativo ? theme.colors.primary : theme.colors.textMuted },
                  ]}
                >
                  {option.count}
                </Texto>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: "row",
    paddingHorizontal: 2,
  },
  pilula: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    /* 40 pontos de altura: abaixo disso o toque falha com o celular na
       mão, em movimento, que é como o motorista usa o app. */
    minHeight: 38,
  },
  rotulo: {
    fontFamily: fonteNativa(600),
    fontSize: 13,
  },
  contagem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  numero: {
    fontFamily: fonteNativa(700),
    fontSize: 11,
  },
});
