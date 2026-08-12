import { Mail } from "@rotta/icons";
import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";

import { GeneralContactButton } from "@/components/general-contact-button";
import { CONTACT_EMAIL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a Rotta por e-mail em ${CONTACT_EMAIL}.`,
  alternates: { canonical: "/contato" },
};

/**
 * Contato (briefing "SITE RESPONSIVO"). Antes era só um link `mailto:`
 * estático (sem cliente de e-mail configurado no navegador, "nada
 * abria"); agora usa o mesmo `LeadContactModal` do `/governo` (variante
 * `"geral"`, Frente A — harmonizar a experiência de contato em vez de
 * um site com formulário e outro com mailto cru).
 */
export default function ContatoPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 px-6 py-20 text-center">
      <Typography variant="headline" as="h1">
        Fale com a gente
      </Typography>
      <Card className="w-full">
        <Card.Body className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </span>
          <GeneralContactButton variant="primary" iconLeft={<Mail className="h-4 w-4" />}>
            Enviar mensagem
          </GeneralContactButton>
          <Typography variant="bodySmall" color="muted">
            Já é cliente? Um atendimento mais rápido está no{" "}
            <Link href="/suporte" className="text-primary hover:underline">
              canal de suporte
            </Link>
            .
          </Typography>
        </Card.Body>
      </Card>
    </div>
  );
}
