import { fonteNativa } from "@rotta/theme";
import { Pressable, StyleSheet, View } from "react-native";

import { Texto } from "../../atoms/Texto";

import type { Theme } from "@rotta/theme";

/**
 * ListRow — a linha de lista com selo de ícone, rótulo e seta.
 *
 * É a espinha das telas de Perfil dos quatro papéis, de Escolas, de
 * Veículos e dos atalhos de Pagamentos no conceito visual de
 * 16/10/2026: "Meus filhos", "Meus dados", "Endereços", "Métodos de
 * pagamento", "Notificações", "Privacidade", "Suporte", "Sair" — e, na
 * lista de escolas, "Escola Municipal São José / Centro · 1,2 km".
 *
 * Contando as 31 telas do conceito, este padrão aparece mais de
 * sessenta vezes. Até aqui cada tela desenhava a sua, com `Pressable`
 * cru e um emoji ou um ícone solto, e o resultado era sessenta linhas
 * que deveriam ser idênticas e não eram.
 *
 * ## O selo quadrado arredondado, e não um círculo
 *
 * O conceito usa dois formatos de propósito: círculo quando o que está
 * ali dentro é uma pessoa (avatar, inicial) e quadrado arredondado
 * quando é um assunto (escola, veículo, documento, pagamento). Manter
 * essa diferença é o que deixa uma lista de pessoas distinguível de
 * uma lista de coisas antes de ler qualquer palavra.
 *
 * ## `tom="perigo"` existe por causa do "Sair"
 *
 * No conceito ele é a única linha vermelha da tela de perfil, e não tem
 * seta: sair não leva a lugar nenhum, encerra. Linha destrutiva com
 * seta promete uma tela que não existe.
 */
export interface ListRowProps {
  rotulo: string;
  /** Segunda linha, menor: "Centro · 1,2 km", "Em rota · 12 alunos". */
  descricao?: string;
  /** Ícone já renderizado pela tela: este pacote não escolhe ícone. */
  icon?: JSX.Element;
  /** Texto à direita, antes da seta: "3 ativos", "07:05". */
  valor?: string;
  /** Seta ou outro acessório à direita, desenhado pela tela. */
  acessorio?: JSX.Element;
  onPress?: () => void;
  tom?: "padrao" | "perigo";
  /** Desenha a linha de separação acima. A primeira da lista não tem. */
  comSeparador?: boolean;
  /**
   * Cada linha vira um cartão próprio, com respiro entre elas.
   *
   * É o que o conceito faz nas listas curtas e tocáveis (escolas,
   * veículos, atalhos do perfil): cada item tem alvo próprio. Listas
   * longas de leitura continuam dentro de um cartão só, com divisória,
   * porque vinte cartões seguidos viram vinte caixas e o olho perde a
   * coluna.
   */
  comoCartao?: boolean;
  /**
   * Marca a linha como escolhida, com borda e selo na cor da marca.
   *
   * Existe para a tela 21 do conceito ("Registrar ocorrência"), onde a
   * pessoa escolhe um tipo entre cinco. Cor sozinha não basta, então a
   * linha escolhida também é anunciada como selecionada pelo leitor de
   * tela.
   */
  selecionado?: boolean;
  /**
   * O formato do selo do ícone.
   *
   * O conceito usa os dois: quadrado arredondado quando o selo
   * identifica um assunto que existe no mundo (uma escola, um
   * veículo), e círculo quando ele identifica uma ação ou um tipo (os
   * cinco tipos de ocorrência da tela 21). Manter a diferença é o que
   * deixa uma lista de coisas distinguível de uma lista de escolhas.
   */
  formatoDoSelo?: "quadrado" | "circulo";
  theme: Theme;
}

export function ListRow({
  rotulo,
  descricao,
  icon,
  valor,
  acessorio,
  onPress,
  tom = "padrao",
  comSeparador = false,
  comoCartao = false,
  selecionado = false,
  formatoDoSelo = "quadrado",
  theme,
}: ListRowProps): JSX.Element {
  const perigo = tom === "perigo";
  const corDoTexto = perigo ? theme.colors.danger : theme.colors.text;

  const conteudo = (
    <View
      style={[
        styles.linha,
        {
          borderTopColor: theme.colors.hairline,
          borderTopWidth: comSeparador && !comoCartao ? StyleSheet.hairlineWidth : 0,
          paddingVertical: theme.spacing[3],
        },
        comoCartao
          ? [
              theme.elevation.soft.native,
              {
                backgroundColor: selecionado ? theme.colors.primaryMuted : theme.colors.card,
                borderColor: selecionado ? theme.colors.primary : theme.colors.hairline,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                paddingHorizontal: theme.spacing[3],
              },
            ]
          : null,
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.selo,
            {
              backgroundColor: perigo ? theme.colors.dangerMuted : theme.colors.primaryMuted,
              borderRadius: formatoDoSelo === "circulo" ? theme.radius.full : theme.radius.md,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}

      <View style={styles.meio}>
        <Texto numberOfLines={1} style={[styles.rotulo, { color: corDoTexto }]}>
          {rotulo}
        </Texto>
        {descricao ? (
          <Texto numberOfLines={1} style={[styles.descricao, { color: theme.colors.textMuted }]}>
            {descricao}
          </Texto>
        ) : null}
      </View>

      {valor ? (
        <Texto numberOfLines={1} style={[styles.valor, { color: theme.colors.textMuted }]}>
          {valor}
        </Texto>
      ) : null}

      {acessorio}
    </View>
  );

  if (!onPress) return conteudo;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={descricao ? `${rotulo}, ${descricao}` : rotulo}
      accessibilityState={{ selected: selecionado }}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressionada : null)}
    >
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    /* 52 pontos de altura mínima: a lista de perfil tem oito linhas
       seguidas, e abaixo disso o dedo acerta a linha de cima. */
    minHeight: 52,
  },
  pressionada: {
    opacity: 0.6,
  },
  selo: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  meio: {
    flex: 1,
    minWidth: 0,
  },
  rotulo: {
    fontFamily: fonteNativa(600),
    fontSize: 14,
  },
  descricao: {
    fontFamily: fonteNativa(400),
    fontSize: 12,
    marginTop: 2,
  },
  valor: {
    fontFamily: fonteNativa(400),
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});
