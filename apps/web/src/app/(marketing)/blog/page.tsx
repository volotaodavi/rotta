import { Typography } from "@rotta/ui/web";

/**
 * Blog (briefing "SITE RESPONSIVO": "estrutura preparada") — nenhum
 * CMS/conteúdo real foi definido ainda; esta rota existe para que o
 * link do rodapé/nav não quebre e para fixar onde o conteúdo entrará.
 */
export default function BlogPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
      <Typography variant="headline" as="h1">
        Blog
      </Typography>
      <Typography variant="body" color="muted">
        Em breve.
      </Typography>
    </div>
  );
}
