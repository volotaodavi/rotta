import { Component } from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import type { ErrorInfo, ReactNode } from "react";

import { Texto } from "@/components/texto";
import { clientErrorsApi } from "@/lib/api-client";
import { identidadeDoBuild } from "@/lib/identidade-do-build";
import { telaAtual } from "@/lib/tela-atual";

/**
 * Rede de segurança contra erro de render não tratado (auditoria
 * minuciosa 03/09/2026) — achado real: `apps/web` tem um `error.tsx`
 * por route group inteiro (`(dashboard)/error.tsx` etc., com
 * diagnóstico completo e `reportClientError`), mas o app mobile nunca
 * teve NENHUM Error Boundary — um erro de render em qualquer tela
 * (RootNavigator pra baixo) sempre caía na tela vermelha nua do React
 * Native (dev) ou simplesmente travava/fechava o app (produção), sem
 * nenhuma chance de recuperação nem registro.
 *
 * `clientErrorsApi.report` já existia pronto no backend com suporte a
 * `app: "MOBILE"` (`packages/api-client/src/endpoints/client-errors.ts`)
 * — só nunca tinha sido chamado daqui. Fecha o mesmo ciclo que
 * `apps/web`/`apps/admin` já tinham: agora um crash do app aparece em
 * "Erros do cliente" (Admin Rotta) igual aos outros dois.
 *
 * Classe (não hook) de propósito — Error Boundary só existe nessa
 * forma no React. Cores fixas (não vem de `useTheme`) e sem nenhuma
 * outra dependência de contexto: esta é literalmente a rede de
 * segurança pro caso de algo acima/dentro dos providers quebrar, então
 * não pode depender de nada que possa ter quebrado junto. Os valores
 * abaixo são os mesmos tokens do tema escuro (`packages/theme`), só
 * copiados como literal.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: (Error & { digest?: string }) | null }
> {
  override state: { error: (Error & { digest?: string }) | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(error, errorInfo.componentStack);
    // Nunca lança — mesma garantia documentada em
    // `apps/web/src/lib/report-client-error.ts`: se o próprio reporte
    // falhar (rede fora do ar), a tela de erro continua funcionando
    // normalmente pro usuário, só ficamos sem o registro desta vez.
    clientErrorsApi
      .report({
        app: "MOBILE",
        message: error.message || "Erro sem mensagem",
        stack: montarRastro(error, errorInfo),
        /*
          A tela de verdade, do navigator raiz até a folha. Era a
          constante "(mobile)" até 13/10/2026, com a justificativa de
          que a pilha teria a tela real — não tem, em build de produção
          a pilha é endereço de bytecode, e num erro nascido dentro do
          reconciliador do React não existe nenhum quadro do produto.
          O resultado prático: seis relatórios de uma aba que não abria,
          nenhum dizendo qual. Ver `lib/tela-atual.ts`.
        */
        path: telaAtual() ?? "(tela desconhecida)",
        source: "error-boundary",
        buildId: identidadeDoBuild(),
      })
      .catch(() => undefined);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <ScrollView
        contentContainerStyle={styles.container}
        style={{ backgroundColor: COLORS.background }}
      >
        <Texto style={styles.titulo}>Algo deu errado</Texto>
        <Texto style={styles.corpo}>
          Ocorreu um erro inesperado. Tente novamente em instantes.
        </Texto>
        {error.message ? <Texto style={styles.mensagem}>{error.message}</Texto> : null}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={this.handleRetry}
          style={styles.botao}
        >
          <Texto style={[styles.botaoTexto, { color: BOTAO_TEXT_COLOR }]}>Tentar novamente</Texto>
        </TouchableOpacity>
      </ScrollView>
    );
  }
}

/**
 * Junta o rastro técnico com a árvore de componentes que estava
 * renderizando quando quebrou.
 *
 * ## O defeito que isto conserta (07/10/2026)
 *
 * O app quebrou na mão de um usuário com "Element type is invalid:
 * expected a string ... but got: undefined", e o relatório que chegou
 * ao plantão do CTO tinha só isto de rastro:
 *
 * ```
 * at createFiberFromTypeAndProps (address at index.android.bundle:1:345165)
 * at reconcileChildFibersImpl (address at index.android.bundle:1:305099)
 * ```
 *
 * Doze quadros, todos de dentro do React, nenhum do produto. Em build
 * de produção o código vira bytecode Hermes, então `error.stack` dá
 * endereço em vez de nome de arquivo, e não existe nenhum quadro da
 * Rotta: a falha acontece no reconciliador, não no nosso código. O
 * plantão sabia que algo quebrou e não tinha como saber O QUÊ.
 *
 * O React entrega essa resposta no segundo argumento de
 * `componentDidCatch`, que esta classe ignorava: `componentStack` lista
 * a cadeia de componentes (`<DriverNavigator>` dentro de
 * `<NavigationContainer>` dentro de `<AppModeProvider>`...) e sobrevive
 * à minificação, porque é construída com os nomes que o React guarda em
 * tempo de execução.
 *
 * `apps/web` já fazia exatamente isto desde a auditoria de 03/09/2026
 * (ver `section-error-boundary.tsx`), com a nota explicando o motivo. O
 * app ficou de fora, e o preço foi um crash de produção não
 * diagnosticável.
 */
function montarRastro(error: Error, errorInfo: ErrorInfo): string {
  const tecnico = error.stack ?? error.message;
  const arvore = errorInfo.componentStack;

  /*
    A seção SEMPRE existe, mesmo vazia, e aqui está o porquê — é o
    conserto de um defeito do próprio instrumento, descoberto em
    13/10/2026.

    A versão anterior fazia `if (!arvore) return tecnico`: sem árvore,
    o relatório saía idêntico ao de antes de o campo existir. Quando o
    crash voltou a acontecer e o relatório chegou sem a árvore, ficaram
    DUAS explicações indistinguíveis: ou o React não forneceu a árvore,
    ou o aparelho estava rodando uma versão antiga do app, sem este
    código. Investigar as duas custou uma noite, e nenhuma das duas era
    verificável a partir do relatório.

    Um instrumento que, ao falhar, produz exatamente a mesma saída de
    "não instalado" não é um instrumento. Agora o relatório distingue:
    se o React não deu nada, ele diz isso com todas as letras.
  */
  const secao = arvore?.trim()
    ? arvore
    : "\n    (o React nao forneceu componentStack nesta ocorrencia)";

  return `${tecnico}\n--- component stack ---${secao}`;
}

/**
 * Cópia literal dos tokens do app (`providers/paleta-do-conceito.ts`) —
 * ver nota da classe acima sobre o porquê de não vir de `useTheme`.
 *
 * Eram os tokens do tema ESCURO, copiados numa época em que o app
 * seguia o sistema operacional. O app é sempre claro desde 15/09/2026:
 * quem batia nesta tela via o aplicativo inteiro branco virar uma tela
 * preta, e tela preta depois de um erro parece o aplicativo morrendo.
 */
const COLORS = {
  background: "#FFFFFF",
  text: "#0F2748",
  textMuted: "#8794A5",
  primary: "#1769FF",
};
/** Texto do botão fica sempre branco em cima de `COLORS.primary` — extraído da `StyleSheet` porque é o único tom que não tem token dedicado (mesmo padrão de `AuthButton`). */
const BOTAO_TEXT_COLOR = "#FFFFFF";

const styles = StyleSheet.create({
  botao: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  botaoTexto: {
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    alignItems: "center",
    flexGrow: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  corpo: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  mensagem: {
    color: COLORS.textMuted,
    fontFamily: "monospace",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  titulo: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
});
