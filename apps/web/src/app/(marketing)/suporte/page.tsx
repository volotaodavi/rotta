import { Headset, MessageCircle } from "@rotta/icons";
import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suporte",
  description:
    "Precisa de ajuda com a Rotta? Clientes abrem chamado direto pelo painel; quem ainda não é cliente fala com a gente em suporte@rotta.com.br.",
  alternates: { canonical: "/suporte" },
};

/** Suporte (briefing "SITE RESPONSIVO") — canal público; suporte autenticado (tickets, Dossiê 20 `SUP-*`) vive no painel logado. */
export default function SuportePage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 px-6 py-20 text-center">
      <div className="flex flex-col items-center gap-2">
        <Typography variant="headline" as="h1">
          Suporte
        </Typography>
        <Typography variant="body" color="muted">
          Escolha o caminho que combina com você.
        </Typography>
      </div>
      <div className="grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-2">
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Headset className="h-5 w-5" />
            </span>
            <Typography variant="subtitle">Já é cliente Rotta</Typography>
            <Typography variant="bodySmall" color="muted">
              Abra um chamado direto pelo painel, na sua conta — nosso time acompanha empresas,
              motoristas e famílias todos os dias.
            </Typography>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <Typography variant="subtitle">Ainda não é cliente</Typography>
            <Typography variant="bodySmall" color="muted">
              Tem dúvidas antes de começar? Fale conosco em{" "}
              <Link href="mailto:suporte@rotta.com.br" className="text-primary hover:underline">
                suporte@rotta.com.br
              </Link>
              .
            </Typography>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
