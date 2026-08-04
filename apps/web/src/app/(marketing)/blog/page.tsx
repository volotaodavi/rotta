import { Newspaper } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";
import Link from "next/link";

/**
 * Blog (briefing "SITE RESPONSIVO": "estrutura preparada") — nenhum
 * CMS/conteúdo real foi definido ainda; esta rota existe para que o
 * link do rodapé/nav não quebre e para fixar onde o conteúdo entrará.
 */
export default function BlogPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Newspaper className="h-6 w-6" />
      </span>
      <Typography variant="headline" as="h1">
        Blog
      </Typography>
      <Typography variant="body" color="muted">
        Ainda estamos preparando o conteúdo. Enquanto isso, veja as{" "}
        <Link href="/faq" className="text-primary hover:underline">
          perguntas frequentes
        </Link>
        .
      </Typography>
    </div>
  );
}
