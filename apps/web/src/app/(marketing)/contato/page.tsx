import { Mail } from "@rotta/icons";
import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

/** Contato (briefing "SITE RESPONSIVO"). */
export default function ContatoPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 px-6 py-20 text-center">
      <Typography variant="headline" as="h1">
        Fale com a gente
      </Typography>
      <Card className="w-full">
        <Card.Body className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </span>
          <Link
            href="mailto:contato@rotta.com.br"
            className="text-lg font-semibold text-text transition-colors hover:text-primary"
          >
            contato@rotta.com.br
          </Link>
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
