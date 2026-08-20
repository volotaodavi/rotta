"use client";

import { Card, Typography } from "@rotta/ui/web";
import { Component, type ReactNode } from "react";

import { reportClientError } from "@/lib/report-client-error";

interface SectionErrorBoundaryProps {
  /** Nome curto da seção, só pra identificar no relatório de erro (ex. "paradas-da-rota"). */
  label: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
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

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error(`[SectionErrorBoundary:${this.props.label}]`, error);
    reportClientError("WEB", error);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card>
          <Card.Body>
            <Typography variant="bodySmall" color="danger">
              Não foi possível carregar esta seção agora. O resto da página continua funcionando —
              recarregue quando puder tentar de novo.
            </Typography>
          </Card.Body>
        </Card>
      );
    }
    return this.props.children;
  }
}
