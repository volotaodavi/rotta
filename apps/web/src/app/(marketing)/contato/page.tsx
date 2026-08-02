import { Typography } from "@rotta/ui/web";

/** Contato (briefing "SITE RESPONSIVO"). */
export default function ContatoPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-6 py-20 text-center">
      <Typography variant="headline" as="h1">
        Fale com a gente
      </Typography>
      <Typography variant="body" color="muted">
        contato@rotta.com.br
      </Typography>
    </div>
  );
}
