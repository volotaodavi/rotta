"use client";

import { Card, Typography } from "@rotta/ui/web";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { reportClientError } from "@/lib/report-client-error";

interface SectionErrorBoundaryProps {
  /** Nome curto da seção, só pra identificar no relatório de erro (ex. "paradas-da-rota"). */
  label: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

/**
 * Boundary de erro por SEÇÃO da página (não a página inteira) — pedido do
 * usuário depois de uma investigação real sobre "algo deu errado" ao criar
 * uma rota (ver Dossiê/histórico de `apps/web/src/app/(dashboard)/error.tsx`):
 * uma tela como `/rotas/[id]` tem várias seções independentes (Paradas,
 * Rotta Route AI, Alunos) — sem isolamento, uma exceção em qualquer uma
 * delas derruba a página INTEIRA pro `error.tsx` do route group, escondendo
 * até a navegação. Com este boundary, só a seção quebrada mostra um aviso
 * local; o resto da tela continua funcionando normalmente.
 *
 * Error Boundaries do React só existem como componente de classe
 * (`componentDidCatch`/`getDerivedStateFromError`) — não há equivalente em
 * hook ainda, mesmo em React 18/19.
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    /**
     * ACHADO REAL (pesquisa em issues reais do React/Next.js, depois de
     * `isModeResolved`, upgrade do Next e `prefetch={false}` nos links do
     * painel NÃO terem resolvido sozinhos o "Server Components render"
     * indeterminístico em `/rotas/[id]` recém-criada): o "erro" real
     * capturado uma vez direto no navegador era `Minified React error
     * #460` — "Suspense Exception: this is not a real error! It's an
     * implementation detail of `use` to interrupt the current render...
     * capturing without rethrowing will lead to unexpected behavior"
     * (https://react.dev/errors/460). Esse "erro" é, na verdade, um sinal
     * INTERNO (um thenable/Promise) que o próprio roteador do Next usa
     * pra pausar o render — nunca deveria chegar até um Error Boundary
     * comum. Se ALGO no meio do caminho (aqui documentado como um bug
     * conhecido do lado do Next, não nosso: "não sobra nenhum `use()`
     * nosso nesta rota") capturar esse sinal sem relançá-lo, ele vira um
     * "erro" de verdade pro React — e a documentação do próprio React é
     * explícita: "capturing without rethrowing will lead to unexpected
     * behavior". Um `getDerivedStateFromError` escrito à mão como o
     * nosso, sem essa checagem, é candidato perfeito a ser justamente
     * esse "algo" — captura QUALQUER coisa lançada, sem distinguir um
     * `Error` de verdade desse sinal interno.
     *
     * A correção: detectar o formato de um sinal do React/Suspense (um
     * thenable — tem `.then` — em vez de um `Error` de verdade) e
     * RELANÇAR em vez de tratar como erro de seção. Relançar aqui faz
     * este componente "falhar ao capturar", e o React propaga o sinal
     * pro Error/Suspense boundary de verdade mais próximo acima —
     * exatamente a orientação da própria mensagem do React.
     */
    if (error && typeof (error as unknown as { then?: unknown }).then === "function") {
      throw error;
    }
    return { hasError: true, errorMessage: error.message, errorStack: error.stack };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(`[SectionErrorBoundary:${this.props.label}]`, error, errorInfo.componentStack);
    // Ao contrário do `error.tsx` do Next (que só recebe a mensagem já
    // REDIGIDA quando a falha nasce durante o render em produção), um
    // Error Boundary de classe capturado aqui no cliente sempre vê o
    // `Error` real, com stack completa — por isso anexamos também o
    // `componentStack` (qual componente estava renderizando quando
    // quebrou), informação que o `error.tsx` nunca tem acesso. Mostrada
    // direto na tela abaixo (pedido do usuário) — nunca escondida atrás
    // de um dashboard externo.
    const enrichedError = new Error(error.message);
    enrichedError.name = error.name;
    enrichedError.stack = `[boundary:${this.props.label}] ${error.stack ?? error.message}\n--- component stack ---${errorInfo.componentStack ?? ""}`;
    reportClientError("WEB", enrichedError);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <Typography variant="bodySmall" color="danger">
              Não foi possível carregar esta seção agora. O resto da página continua funcionando —
              recarregue quando puder tentar de novo.
            </Typography>
            <div className="rounded-md border border-danger/30 bg-danger/5 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">
                Diagnóstico técnico ({this.props.label})
              </p>
              <p className="mb-2 whitespace-pre-wrap break-words font-mono text-xs text-text">
                {this.state.errorMessage}
              </p>
              {this.state.errorStack ? (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-black/5 p-2 font-mono text-[11px] text-text-muted">
                  {this.state.errorStack}
                </pre>
              ) : null}
            </div>
          </Card.Body>
        </Card>
      );
    }
    return this.props.children;
  }
}
