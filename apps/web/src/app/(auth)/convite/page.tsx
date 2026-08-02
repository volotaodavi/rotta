"use client";

import { Button, FormField, Input, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** "Já fui convidado" — inserir código (Dossiê 15, briefing "Convite de Motoristas": ex. "M586PO"). */
export default function InserirCodigoConvitePage(): JSX.Element {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (codigo.trim()) {
      router.push(`/convite/${codigo.trim().toUpperCase()}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Inserir código de convite</Typography>
        <Typography variant="bodySmall" color="muted">
          Ex.: M586PO
        </Typography>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Código do convite" isRequired>
          <Input
            required
            autoCapitalize="characters"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
          />
        </FormField>
        <Button type="submit" variant="primary" fullWidth>
          Confirmar
        </Button>
      </form>
    </div>
  );
}
