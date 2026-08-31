"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Card, FormField, Input, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import { useState, type FormEvent } from "react";

import { useCreateJoinRequest, useMyJoinRequest } from "../hooks/use-join-requests";

/**
 * Bloqueio total do Painel Web pro Motorista/Monitor autônomo
 * (`registerAutonomo`) enquanto `!user.companyId` (Frente 9, auditoria
 * 31/08/2026) — mesmo molde de `IdentityVerificationBlockScreen`/
 * `BillingBlockScreen`: `(dashboard)/layout.tsx` renderiza este
 * componente NO LUGAR de `children`, pra qualquer rota. Paridade com o
 * app nativo, que já tinha esse gate (`VinculoPendenteStatusScreen`,
 * `RootNavigator.tsx`) — o Painel Web nunca teve o equivalente, essa
 * conta via o painel vazio/quebrado até agora.
 *
 * A aprovação da empresa não atualiza a sessão sozinha (o token/`user`
 * em memória não muda até um novo login) — mesma limitação, mesma
 * solução do app nativo: "entre novamente pra acessar" em vez de tentar
 * um refresh mágico de sessão no meio da navegação.
 */
export function VinculoPendenteBlockScreen(): JSX.Element {
  const { user, logout } = useAuth();
  const { data: joinRequest, isLoading } = useMyJoinRequest();
  const criar = useCreateJoinRequest();
  const [codigo, setCodigo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const valor = codigo.trim().toUpperCase();
    if (!valor) return;
    setErrorMessage(null);
    criar.mutate(valor, {
      onError: (error) => {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Não foi possível enviar o pedido. Confira o código e tente de novo.",
        );
      },
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Body className="flex flex-col items-center gap-4 py-10 text-center">
          <Typography variant="title">Falta pouco, {user?.nome?.split(" ")[0] ?? ""}</Typography>
          <Typography variant="body" color="muted">
            Sua conta de {user?.role === "monitor" ? "monitor" : "motorista"} autônomo já existe —
            falta só uma transportadora aprovar seu vínculo pra você começar a usar a Rotta.
          </Typography>

          {isLoading ? (
            <Spinner size="md" />
          ) : !joinRequest ? (
            <Typography variant="bodySmall" color="muted">
              Você ainda não informou o código de nenhuma transportadora.
            </Typography>
          ) : joinRequest.status === "PENDENTE" ? (
            <Typography variant="bodySmall" color="muted">
              Pedido enviado para <strong>{joinRequest.companyName}</strong>, aguardando a empresa
              aprovar.
            </Typography>
          ) : joinRequest.status === "RECUSADO" ? (
            <div className="flex flex-col gap-1">
              <Typography variant="bodySmall" color="danger">
                {joinRequest.companyName} recusou seu pedido
                {joinRequest.motivoRecusa ? `: ${joinRequest.motivoRecusa}` : "."}
              </Typography>
              <Typography variant="bodySmall" color="muted">
                Você pode informar o código de outra transportadora.
              </Typography>
            </div>
          ) : (
            <Typography variant="bodySmall" color="muted">
              Pedido aprovado por <strong>{joinRequest.companyName}</strong> — entre novamente pra
              acessar.
            </Typography>
          )}

          {!joinRequest || joinRequest.status === "RECUSADO" ? (
            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
              <FormField label="Código da transportadora" isRequired>
                <Input
                  required
                  autoCapitalize="characters"
                  placeholder="Ex.: TRN-000001"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value)}
                />
              </FormField>
              {errorMessage ? (
                <Typography variant="bodySmall" color="danger">
                  {errorMessage}
                </Typography>
              ) : null}
              <button
                type="submit"
                disabled={criar.isPending}
                className={buttonVariants({ variant: "primary" })}
              >
                {criar.isPending ? "Enviando…" : "Enviar pedido"}
              </button>
            </form>
          ) : null}

          <button
            type="button"
            onClick={() => void logout()}
            className={buttonVariants({ variant: "secondary" })}
          >
            Sair
          </button>
        </Card.Body>
      </Card>
    </div>
  );
}
