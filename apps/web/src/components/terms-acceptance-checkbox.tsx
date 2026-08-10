"use client";

import { Checkbox, Typography } from "@rotta/ui/web";
import Link from "next/link";

/**
 * Checkbox de aceite dos Termos de Uso/Política de Privacidade
 * (Dossiê 34 — Prompt 25). Antes desta entrega, os três fluxos de
 * cadastro (`criar-conta/empresa`, `criar-conta/pessoal`, `convite/
 * [codigo]`) enviavam `aceiteTermos: true` fixo no corpo da requisição
 * — nenhum usuário jamais viu ou marcou um aceite real, e as próprias
 * páginas de Termos/Privacidade nem existiam. Corrigido nos dois
 * lados: as páginas existem (`/termos`, `/privacidade`) e este
 * checkbox precisa estar marcado antes do formulário poder ser
 * enviado (ver `disabled={!aceitou}` no botão de cada tela chamadora).
 */
export function TermsAcceptanceCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <Typography variant="bodySmall" color="muted">
        Li e aceito os{" "}
        <Link href="/termos" target="_blank" className="text-primary underline">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" target="_blank" className="text-primary underline">
          Política de Privacidade
        </Link>{" "}
        da Rotta.
      </Typography>
    </label>
  );
}
