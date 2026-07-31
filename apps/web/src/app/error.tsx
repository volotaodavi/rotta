"use client";

import { useEffect } from "react";

/**
 * Error Boundary global do App Router (convencao de arquivo especial
 * `error.tsx` do Next.js) — captura qualquer erro nao tratado renderizado
 * abaixo dele. Segue o mesmo padrao estrutural de "tela de erro" do
 * Dossie 10, Secao 9.11 (icone + frase curta + acao), a implementar com
 * o Design System real quando `@rotta/ui` tiver componentes.
 *
 * Nenhum detalhe tecnico do erro e exibido ao usuario final — apenas
 * registrado (integracao com Sentry a configurar junto com o primeiro
 * modulo real, Dossie 23, Secao 9).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-text">
      <h1 className="text-h1 font-semibold">Algo deu errado</h1>
      <p className="text-text-muted">
        Ocorreu um erro inesperado. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
      >
        Tentar novamente
      </button>
    </div>
  );
}
