import { fonteNativa } from "@rotta/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * AppHeader — o cabeçalho de topo com perfil, sino e avatar.
 *
 * No conceito visual de 16/10/2026 ele aparece em toda tela inicial, e
 * carrega três coisas: onde eu estou, quantos avisos esperam por mim, e
 * quem eu sou agora.
 *
 * ## "Quem eu sou agora" não é enfeite nesta plataforma
 *
 * A mesma pessoa, na Rotta, pode ser responsável de um aluno e
 * motorista de uma transportadora, e o produto já tem telas separadas
 * de área pessoal e área profissional. Quando `perfilAtivo` vem
 * preenchido, o cabeçalho mostra e permite trocar. Sem isso, a pessoa
 * olha uma tela de motorista achando que está na de mãe, e as duas
 * mostram viagem.
 *
 * ## A contagem do sino
 *
 * `avisos` é o número real de notificações não lidas. Acima de 99 vira
 * "99+", porque três dígitos num círculo de 18 pontos deixam de ser
 * número e viram borrão. Zero não desenha bolinha nenhuma: ponto
 * vermelho permanente ensina a pessoa a ignorar o ponto vermelho.
 */
export interface AppHeaderProps {
  /** Nome do produto ou da tela. */
  titulo: string;
  /** Perfil em uso, por exemplo "Transportadora" ou "Responsável". */
  perfilAtivo?: string;
  onTrocarPerfil?: () => void;
  avisos?: number;
  onAbrirAvisos?: () => void;
  onAbrirPerfil?: () => void;
  /** Iniciais de quem está logado, para o avatar. */
  iniciais?: string;
  /** Ícones já renderizados pela tela: este pacote não escolhe ícone. */
  iconeMarca?: JSX.Element;
  iconeSino?: JSX.Element;
  iconeTrocarPerfil?: JSX.Element;
  theme: Theme;
}

export function AppHeader({
  titulo,
  perfilAtivo,
  onTrocarPerfil,
  avisos = 0,
  onAbrirAvisos,
  onAbrirPerfil,
  iniciais,
  iconeMarca,
  iconeSino,
  iconeTrocarPerfil,
  theme,
}: AppHeaderProps): JSX.Element {
  const podeTrocar = Boolean(perfilAtivo && onTrocarPerfil);
  const contagem = avisos > 99 ? "99+" : String(avisos);

  return (
    <View
      style={[
        styles.barra,
        {
          backgroundColor: theme.colors.background,
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
        },
      ]}
    >
      <View style={styles.esquerda}>
        {iconeMarca}
        <View style={styles.textos}>
          <Text numberOfLines={1} style={[styles.titulo, { color: theme.colors.text }]}>
            {titulo}
          </Text>

          {perfilAtivo ? (
            <Pressable
              accessibilityRole={podeTrocar ? "button" : "text"}
              accessibilityLabel={
                podeTrocar ? `Perfil ${perfilAtivo}, tocar para trocar` : `Perfil ${perfilAtivo}`
              }
              disabled={!podeTrocar}
              onPress={onTrocarPerfil}
              style={styles.perfil}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                numberOfLines={1}
                style={[styles.perfilTexto, { color: theme.colors.textMuted }]}
              >
                {perfilAtivo}
              </Text>
              {podeTrocar ? iconeTrocarPerfil : null}
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.direita, { gap: theme.spacing[3] }]}>
        {onAbrirAvisos ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={avisos > 0 ? `Notificações, ${contagem} não lidas` : "Notificações"}
            onPress={onAbrirAvisos}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {iconeSino}
            {avisos > 0 ? (
              <View
                style={[
                  styles.bolinha,
                  { backgroundColor: theme.colors.danger, borderRadius: theme.radius.full },
                ]}
              >
                <Text style={[styles.bolinhaTexto, { color: theme.colors.onPrimary }]}>
                  {contagem}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {onAbrirPerfil ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
            onPress={onAbrirPerfil}
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.primaryMuted,
                borderRadius: theme.radius.full,
              },
            ]}
          >
            <Text style={[styles.avatarTexto, { color: theme.colors.primary }]}>
              {iniciais ?? "?"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  esquerda: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 10,
  },
  textos: {
    flexShrink: 1,
    minWidth: 0,
  },
  titulo: {
    fontFamily: fonteNativa(700),
    fontSize: 17,
  },
  perfil: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  perfilTexto: {
    fontFamily: fonteNativa(400),
    fontSize: 12,
  },
  direita: {
    alignItems: "center",
    flexDirection: "row",
  },
  bolinha: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -8,
    top: -6,
  },
  bolinhaTexto: {
    fontFamily: fonteNativa(700),
    fontSize: 10,
  },
  avatar: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarTexto: {
    fontFamily: fonteNativa(700),
    fontSize: 13,
  },
});
