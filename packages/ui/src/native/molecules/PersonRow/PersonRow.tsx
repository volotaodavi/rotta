import { fonteNativa } from "@rotta/theme";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { StatusPill, type StatusTone } from "../../atoms/StatusPill";

import type { Theme } from "@rotta/theme";

/**
 * PersonRow — a linha de pessoa com avatar, estado e horário.
 *
 * É a linha mais repetida do conceito visual de 16/10/2026: lista de
 * alunos do motorista e do monitor, equipe da transportadora, motoristas
 * do veículo, filhos do responsável. Em todas elas a estrutura é a
 * mesma: quem é, o que está acontecendo, e quando aconteceu.
 *
 * ## Iniciais em vez de foto, por padrão
 *
 * `avatarUri` é opcional porque foto de aluno é dado sensível de
 * criança: ela só aparece onde o produto realmente guardar e tiver base
 * para isso. Sem foto, a linha mostra as iniciais sobre o fundo suave da
 * marca, que é legível, rápido e não inventa um rosto genérico.
 *
 * ## Horário é hora real, nunca "há pouco"
 *
 * O conceito mostra "07:05" ao lado do estado. Quem chama formata a
 * partir de `processadoEm` do evento real. Texto relativo do tipo "há 2
 * minutos" envelhece na tela parada e vira mentira silenciosa quando o
 * app fica aberto no suporte do painel durante a viagem inteira.
 */
export interface PersonRowProps {
  nome: string;
  /** Linha de baixo: escola, parada, cargo. Opcional. */
  subtitulo?: string;
  avatarUri?: string;
  status?: { label: string; tone: StatusTone };
  /** Já formatado pela tela, por exemplo "07:05". */
  horario?: string;
  /**
   * Seta ou outro acessório no fim da linha, desenhado pela tela.
   *
   * No conceito de 16/10/2026 a linha de uma pessoa que leva a outra
   * tela termina em seta ("Lucas Silva / Transporte Escolar >"), e a
   * que só informa estado termina na etiqueta. Sem essa diferença, as
   * duas parecem tocáveis e metade não é.
   */
  acessorio?: JSX.Element;
  onPress?: () => void;
  theme: Theme;
}

/** Primeira letra do primeiro e do último nome, no máximo duas. */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.charAt(0).toUpperCase();
  return (partes[0]!.charAt(0) + partes[partes.length - 1]!.charAt(0)).toUpperCase();
}

export function PersonRow({
  nome,
  subtitulo,
  avatarUri,
  status,
  horario,
  acessorio,
  onPress,
  theme,
}: PersonRowProps): JSX.Element {
  const conteudo = (
    <View style={[styles.linha, { paddingVertical: theme.spacing[3] }]}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.full },
        ]}
      >
        {avatarUri ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: avatarUri }}
            style={[styles.foto, { borderRadius: theme.radius.full }]}
          />
        ) : (
          <Text style={[styles.iniciais, { color: theme.colors.primary }]}>{iniciaisDe(nome)}</Text>
        )}
      </View>

      <View style={styles.meio}>
        <Text numberOfLines={1} style={[styles.nome, { color: theme.colors.text }]}>
          {nome}
        </Text>
        {subtitulo ? (
          <Text numberOfLines={1} style={[styles.subtitulo, { color: theme.colors.textMuted }]}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      <View style={[styles.direita, { gap: theme.spacing[1] }]}>
        {status ? <StatusPill label={status.label} tone={status.tone} theme={theme} /> : null}
        {horario ? (
          <Text style={[styles.horario, { color: theme.colors.textMuted }]}>{horario}</Text>
        ) : null}
      </View>

      {acessorio}
    </View>
  );

  if (!onPress) return conteudo;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={nome} onPress={onPress}>
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  foto: {
    height: 40,
    width: 40,
  },
  iniciais: {
    fontFamily: fonteNativa(700),
    fontSize: 14,
  },
  meio: {
    /* `flex: 1` com `minWidth: 0` é o que faz o nome longo ser cortado
       com reticências em vez de empurrar o status para fora da tela. */
    flex: 1,
    minWidth: 0,
  },
  nome: {
    fontFamily: fonteNativa(600),
    fontSize: 15,
  },
  subtitulo: {
    fontFamily: fonteNativa(400),
    fontSize: 13,
    marginTop: 2,
  },
  direita: {
    alignItems: "flex-end",
  },
  horario: {
    fontFamily: fonteNativa(400),
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
});
