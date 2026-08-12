"use client";

import { DiditSdk } from "@didit-protocol/sdk-web";
import { ShieldAlert } from "@rotta/icons";
import { Button, Card, Typography } from "@rotta/ui/web";
import { useState } from "react";

import { useCreateIdentityVerificationSession } from "@/features/identity-verification/hooks/use-identity-verification";

/**
 * Bloqueio total do Painel Web quando `identityVerificationStatus ===
 * "REPROVADA"` — pedido explícito do usuário: ao recusar (manualmente
 * pelo Admin Rotta ou direto no Business Console da Didit), "não deixe
 * ele acessar nada. Deixe apenas a opção de tentar verificação no
 * Didit novamente." `(dashboard)/layout.tsx` renderiza este componente
 * NO LUGAR de `children` — nenhuma rota do painel fica acessível
 * enquanto bloqueado, mesmo digitando a URL direto.
 *
 * "Tentar novamente" reaproveita a mesma sessão hospedada da Didit já
 * usada em `/verificacao-identidade`. Criar uma nova sessão já marca
 * `EM_ANDAMENTO` no banco (`IdentityVerificationService.createSession`)
 * — só por isso o painel já desbloqueia (só `REPROVADA` bloqueia),
 * mesmo que a pessoa feche o formulário sem concluir; a decisão final
 * de novo só vem do webhook, nunca da resposta do SDK.
 */
export function IdentityVerificationBlockScreen({
  motivo,
}: {
  motivo: string | null;
}): JSX.Element {
  const createSession = useCreateIdentityVerificationSession();
  const [erro, setErro] = useState<string | null>(null);

  async function tentarNovamente(): Promise<void> {
    setErro(null);
    try {
      const session = await createSession.mutateAsync({
        callbackUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
      await DiditSdk.shared.startVerification({ url: session.url });
    } catch {
      setErro("Não foi possível iniciar uma nova verificação agora. Tente novamente em instantes.");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Body className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert size={28} />
          </span>
          <Typography variant="title">Verificação de identidade recusada</Typography>
          <Typography variant="body" color="muted">
            {motivo ?? "Sua verificação de identidade não foi aprovada."}
          </Typography>
          <Typography variant="bodySmall" color="muted">
            O acesso ao painel fica bloqueado até você refazer a verificação.
          </Typography>
          {erro && (
            <Typography variant="caption" color="danger">
              {erro}
            </Typography>
          )}
          <Button isLoading={createSession.isPending} onClick={() => void tentarNovamente()}>
            Tentar verificação novamente
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}
