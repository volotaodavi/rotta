"use client";

import { Copy } from "@rotta/icons";
import { Button, Card, Typography, useToast } from "@rotta/ui/web";
import { useState } from "react";

import { useCreateInvite } from "@/features/team/hooks/use-invites";

/**
 * Convite do Portal da Escola (22/09/2026).
 *
 * Fica aqui, na tela de Escolas, e não em "Equipe", porque a secretaria
 * NÃO é equipe da transportadora: a conta que nasce deste convite não
 * ganha vínculo nenhum com a empresa que a convidou — ela é ligada à
 * ESCOLA, e enxerga os alunos dessa escola venham eles de qual
 * transportadora vierem. Botar isso em "Equipe" faria parecer o
 * contrário, e o convite errado aqui significa dar a alguém a lista de
 * crianças de uma escola que não é a dele.
 *
 * Por isso o convite é sempre gerado a partir de UMA escola específica
 * da lista, nunca de um seletor solto: o `schoolId` vem da linha em que
 * a pessoa clicou.
 */
export function ConvidarSecretariaPanel({
  schoolId,
  schoolNome,
  companyId,
  onClose,
}: {
  schoolId: string;
  schoolNome: string;
  companyId: string | null | undefined;
  onClose: () => void;
}): JSX.Element {
  const criarConvite = useCreateInvite(companyId);
  const [codigo, setCodigo] = useState<string | null>(null);
  const toast = useToast();

  // Query string, não path dinâmico — mesmo motivo de
  // `InviteTeamMemberPanel`: todo código é único, então todo link seria
  // um "primeiro acesso a um segmento nunca visto", o gatilho exato do
  // bug do App Router já reproduzido em produção.
  const link =
    codigo && typeof window !== "undefined"
      ? `${window.location.origin}/convite?codigo=${codigo}`
      : null;

  async function gerar(): Promise<void> {
    try {
      const result = await criarConvite.mutateAsync({ role: "escola", schoolId });
      setCodigo(result.codigo);
    } catch {
      // O backend recusa escola não vinculada à transportadora — a
      // mensagem diz o que fazer, em vez de um "erro" genérico.
      toast.error(
        "Não foi possível gerar o convite. Confira se esta escola está vinculada à sua transportadora.",
      );
    }
  }

  async function copiar(): Promise<void> {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado.");
  }

  return (
    <Card>
      <Card.Header title={`Acesso da secretaria — ${schoolNome}`} />
      <Card.Body className="flex flex-col gap-3">
        {!codigo ? (
          <>
            <Typography variant="bodySmall" color="muted">
              Gera um código para a secretaria desta escola criar a própria conta. Com ela, a escola
              vê quais alunos vão de ônibus hoje e se já embarcaram — somente leitura, sem acesso a
              nada da sua operação.
            </Typography>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                isLoading={criarConvite.isPending}
                onClick={() => void gerar()}
              >
                Gerar convite da secretaria
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <Typography variant="bodySmall" color="muted">
              Envie este link para a secretaria de <strong>{schoolNome}</strong>. Ele vale para esta
              escola e só pode ser usado uma vez.
            </Typography>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3">
              <Typography variant="bodySmall" className="flex-1 break-all font-mono">
                {link}
              </Typography>
              <button
                type="button"
                onClick={() => void copiar()}
                aria-label="Copiar link do convite"
                className="text-text-muted hover:text-text"
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="flex gap-2">
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
