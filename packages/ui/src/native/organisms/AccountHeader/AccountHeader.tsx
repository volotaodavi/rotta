import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * AccountHeader — o topo azul das telas de conta.
 *
 * É a assinatura visual da área financeira no conceito de 16/10/2026:
 * um azul profundo que sangra até a barra de status, com a marca, o
 * perfil em uso, o sino e o avatar; dentro dele, a faixa de saldo em
 * azul vivo; e, por baixo, a folha branca de conteúdo subindo por cima
 * da faixa.
 *
 * ## Por que o topo sangra em vez de ser um cartão
 *
 * Porque é o que separa "uma tela com um cartão azul" de "a tela da
 * minha conta". Um cartão azul com margem dos dois lados é o que
 * qualquer template faz. O conceito pinta a área inteira, encosta na
 * barra de status, e deixa a folha branca subir por cima: a tela ganha
 * duas camadas reais, e o saldo fica na de baixo, que é onde ele
 * pertence.
 *
 * ## O olho que esconde o saldo
 *
 * O transportador abre o app dentro da van, com passageiro atrás e
 * gente ao lado na escola, e a tela fica no suporte a viagem inteira.
 * Saldo sempre visível ali é exposição real. Quem chama decide o
 * padrão; este componente só desenha os dois estados.
 *
 * ## Texto sobre azul não usa o cinza de texto
 *
 * `textMuted` foi calculado para fundo claro: sobre azul profundo ele
 * perde contraste e some. Por isso existe `onBrandMuted` na paleta, e é
 * ele que pinta o perfil abaixo da marca.
 */
export interface AccountHeaderProps {
  /** Nome do produto, por exemplo "Rotta". */
  titulo: string;
  /** Perfil em uso, por exemplo "Transportadora". */
  perfilAtivo?: string;
  onTrocarPerfil?: () => void;
  avisos?: number;
  onAbrirAvisos?: () => void;
  onAbrirPerfil?: () => void;
  /** Iniciais de quem está logado, para o avatar. */
  iniciais?: string;
  onVoltar?: () => void;

  /** Rótulo da faixa, por exemplo "Saldo disponível". */
  rotuloDoSaldo: string;
  /** Já formatado, por exemplo "R$ 12.480,50". */
  valorFormatado: string;
  visivel: boolean;
  onAlternarVisibilidade: () => void;
  onAbrirDetalhe?: () => void;

  /** Ícones já renderizados pela tela: este pacote não escolhe ícone. */
  iconeMarca?: JSX.Element;
  iconeSino?: JSX.Element;
  iconeTrocarPerfil?: JSX.Element;
  iconeVoltar?: JSX.Element;
  iconeVisivel?: JSX.Element;
  iconeOculto?: JSX.Element;
  iconeDetalhe?: JSX.Element;

  /** Altura da barra de status, vinda do `useSafeAreaInsets()` da tela. */
  recuoDoTopo?: number;
  /**
   * Quanto a folha branca de conteúdo vai subir por cima da faixa. O
   * azul cresce o mesmo tanto, para a sobreposição não revelar o fundo.
   */
  sobreposicaoDaFolha?: number;
  theme: Theme;
}

export function AccountHeader({
  titulo,
  perfilAtivo,
  onTrocarPerfil,
  avisos = 0,
  onAbrirAvisos,
  onAbrirPerfil,
  iniciais,
  onVoltar,
  rotuloDoSaldo,
  valorFormatado,
  visivel,
  onAlternarVisibilidade,
  onAbrirDetalhe,
  iconeMarca,
  iconeSino,
  iconeTrocarPerfil,
  iconeVoltar,
  iconeVisivel,
  iconeOculto,
  iconeDetalhe,
  recuoDoTopo = 0,
  sobreposicaoDaFolha = 24,
  theme,
}: AccountHeaderProps): JSX.Element {
  const podeTrocar = Boolean(perfilAtivo && onTrocarPerfil);
  const contagem = avisos > 99 ? "99+" : String(avisos);

  return (
    <View
      style={[
        styles.topo,
        {
          backgroundColor: theme.colors.brandDeep,
          paddingTop: recuoDoTopo + theme.spacing[2],
          paddingBottom: sobreposicaoDaFolha,
        },
      ]}
    >
      <View style={[styles.barra, { paddingHorizontal: theme.spacing[4] }]}>
        <View style={styles.esquerda}>
          {onVoltar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={onVoltar}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {iconeVoltar}
            </Pressable>
          ) : null}

          {iconeMarca}

          <View style={styles.textos}>
            <Text numberOfLines={1} style={[styles.titulo, { color: theme.colors.onPrimary }]}>
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
                  style={[styles.perfilTexto, { color: theme.colors.onBrandMuted }]}
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
              accessibilityLabel={
                avisos > 0 ? `Notificações, ${contagem} não lidas` : "Notificações"
              }
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
                { backgroundColor: theme.colors.brandBand, borderRadius: theme.radius.full },
              ]}
            >
              <Text style={[styles.avatarTexto, { color: theme.colors.onPrimary }]}>
                {iniciais ?? "?"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.faixa,
          {
            backgroundColor: theme.colors.brandBand,
            borderRadius: theme.radius.lg,
            marginHorizontal: theme.spacing[4],
            marginTop: theme.spacing[4],
            padding: theme.spacing[4],
          },
        ]}
      >
        <View style={styles.faixaTextos}>
          <View style={styles.faixaRotulo}>
            <Text style={[styles.rotulo, { color: theme.colors.onPrimary }]}>{rotuloDoSaldo}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visivel ? "Esconder saldo" : "Mostrar saldo"}
              onPress={onAlternarVisibilidade}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {visivel ? iconeVisivel : iconeOculto}
            </Pressable>
          </View>

          <Text
            accessibilityLabel={visivel ? valorFormatado : "Saldo oculto"}
            numberOfLines={1}
            style={[styles.valor, { color: theme.colors.onPrimary }]}
          >
            {visivel ? valorFormatado : "••••••"}
          </Text>
        </View>

        {onAbrirDetalhe ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${rotuloDoSaldo}`}
            onPress={onAbrirDetalhe}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {iconeDetalhe}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topo: {
    width: "100%",
  },
  barra: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 44,
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
    fontSize: 17,
    fontWeight: "700",
  },
  perfil: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  perfilTexto: {
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
    fontSize: 10,
    fontWeight: "700",
  },
  avatar: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarTexto: {
    fontSize: 13,
    fontWeight: "700",
  },
  faixa: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  faixaTextos: {
    flex: 1,
    minWidth: 0,
  },
  faixaRotulo: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: "600",
    /* Levemente translúcido seria mais bonito e pior: contraste de
       rótulo sobre azul já fica no limite em tela ao sol. */
    opacity: 0.92,
  },
  valor: {
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 4,
  },
});
