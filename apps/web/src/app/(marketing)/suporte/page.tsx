import { Typography } from "@rotta/ui/web";

/** Suporte (briefing "SITE RESPONSIVO") — canal público; suporte autenticado (tickets, Dossiê 20 `SUP-*`) vive no painel logado. */
export default function SuportePage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-6 py-20 text-center">
      <Typography variant="headline" as="h1">
        Suporte
      </Typography>
      <Typography variant="body" color="muted">
        Já é cliente? Abra um chamado direto pelo painel, na sua conta. Ainda não é cliente e tem
        dúvidas? Fale conosco em suporte@rotta.com.br.
      </Typography>
    </div>
  );
}
