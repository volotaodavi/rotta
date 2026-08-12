"use client";

import { Button } from "@rotta/ui/web";
import { useState, type ComponentProps } from "react";

import { LeadContactModal } from "./lead-contact-modal";

import { CONTACT_EMAIL } from "@/lib/site-config";


/** Versão enxuta (variante `"geral"`) do modal de contato pra `/contato` — mesmo padrão do `GovernoContactButton`, sem os campos exclusivos de governo. */
export function GeneralContactButton({
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, "onClick">): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button {...buttonProps} onClick={() => setIsOpen(true)}>
        {children}
      </Button>
      <LeadContactModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        toEmail={CONTACT_EMAIL}
        variant="geral"
        defaultSubject="Contato pelo site da Rotta"
        title="Fale com a Rotta"
        description="Preencha o essencial — a gente monta o e-mail pra você, já pronto pra enviar do seu cliente de e-mail."
      />
    </>
  );
}
