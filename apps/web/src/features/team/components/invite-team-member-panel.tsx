"use client";

import { Copy } from "@rotta/icons";
import { Button, Card, Typography, useToast } from "@rotta/ui/web";
import { useState } from "react";

import type { Role } from "@rotta/api-client";

import { useCreateInvite } from "@/features/team/hooks/use-invites";


/**
 * Pedido do usuário: "a janela de 'equipe' deve ter a possibilidade de
 * adicionar outro motorista e adicionar um monitor (cadastro manual ou
 * pré-cadastro)." O único mecanismo real já pronto no backend para uma
 * empresa adicionar alguém à própria equipe é o convite de papel
 * (`POST /companies/:id/invites`, Dossiê 15) — a empresa gera o código
 * manualmente (por isso "cadastro manual": é ela quem decide o papel e
 * dispara a criação), e o vínculo fica como um "pré-cadastro" até a
 * pessoa terminar de se cadastrar sozinha com o código. Não existe hoje
 * (e não é seguro criar às pressas) um endpoint que crie a conta
 * completa da pessoa com senha temporária em nome da empresa.
 */
export function InviteTeamMemberPanel({
  companyId,
  role,
  label,
  onClose,
}: {
  companyId: string | null | undefined;
  role: Role;
  label: string;
  onClose: () => void;
}): JSX.Element {
  const createInvite = useCreateInvite(companyId);
  const [codigo, setCodigo] = useState<string | null>(null);
  const toast = useToast();

  // Query string (`?codigo=`), não path (`/convite/${codigo}`) — o path
  // dinâmico era exatamente a rota que reproduzia o "Server Components
  // render" em produção (todo código de convite é único, então todo
  // link gerado aqui seria "primeiro acesso a um segmento nunca visto",
  // o gatilho do bug). Ver `/convite/page.tsx`.
  const link =
    codigo && typeof window !== "undefined"
      ? `${window.location.origin}/convite?codigo=${codigo}`
      : null;

  async function handleGerar(): Promise<void> {
    try {
      const result = await createInvite.mutateAsync(role);
      setCodigo(result.codigo);
    } catch {
      toast.error(`Não foi possível gerar o convite de ${label.toLowerCase()}.`);
    }
  }

  async function handleCopiar(): Promise<void> {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado.");
  }

  function handleCompartilharWhatsApp(): void {
    if (!link) return;
    const mensagem = `Você foi convidado para fazer parte da equipe na Rotta como ${label.toLowerCase()}. Complete seu cadastro por aqui: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  return (
    <Card>
      <Card.Header title={`Adicionar ${label.toLowerCase()}`} />
      <Card.Body className="flex flex-col gap-3">
        {!codigo ? (
          <>
            <Typography variant="bodySmall" color="muted">
              Gera um código de convite: a pessoa completa o próprio cadastro com ele e o vínculo de{" "}
              {label.toLowerCase()} com a sua empresa é criado automaticamente.
            </Typography>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                isLoading={createInvite.isPending}
                onClick={() => void handleGerar()}
              >
                Gerar convite de {label.toLowerCase()}
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <Typography variant="bodySmall" color="muted">
              Envie este link para a pessoa completar o cadastro como {label.toLowerCase()}. Válido
              por tempo limitado.
            </Typography>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3">
              <Typography variant="bodySmall" className="flex-1 break-all font-mono">
                {link}
              </Typography>
              <button
                type="button"
                onClick={() => void handleCopiar()}
                aria-label="Copiar link do convite"
                className="text-text-muted hover:text-text"
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleCompartilharWhatsApp}>
                Compartilhar por WhatsApp
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
