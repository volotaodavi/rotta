import { Button } from "../../atoms/Button/Button";
import { Typography } from "../../atoms/Typography/Typography";

/**
 * ErrorState — pedido real do usuário: "O botão de 'tentar novamente' não
 * funciona em nenhum dos casos. Conserte para que funcione." Auditoria
 * encontrou dezenas de telas (`web`/`admin`) que mostravam o texto "Tente
 * novamente" quando uma busca falhava, mas **sem nenhum botão** — só a
 * frase, sem ação nenhuma pro usuário clicar. Este componente único
 * substitui esse padrão quebrado: sempre um botão de verdade, que chama
 * `onRetry` (tipicamente o `refetch` do `useQuery` da própria tela) — nunca
 * mais um "tente novamente" que não tenta nada.
 */
export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  retryLabel?: string;
}

export function ErrorState({
  message,
  onRetry,
  isRetrying = false,
  retryLabel = "Tentar novamente",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Typography variant="body" color="danger">
        {message}
      </Typography>
      <Button variant="secondary" size="sm" isLoading={isRetrying} onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
