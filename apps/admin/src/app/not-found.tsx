import { Button, Typography } from "@rotta/ui/web";
import Image from "next/image";
import Link from "next/link";

/**
 * 404 personalizada do App Router (convenção de arquivo especial
 * `not-found.tsx`) — mesma lacuna do Painel Web (`apps/web/src/app/
 * not-found.tsx`): sem este arquivo, o Next.js renderizava a página em
 * branco padrão do framework pra qualquer rota inexistente do Admin.
 * Segue o mesmo padrão visual de `error.tsx` deste app.
 */
export default function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-text">
      <Image src="/brand/rotta-mark-512.png" alt="Rotta" width={56} height={56} priority />
      <div className="flex flex-col gap-2">
        <Typography variant="headline" as="h1">
          Página não encontrada
        </Typography>
        <Typography variant="body" color="muted">
          O endereço que você tentou acessar não existe ou foi movido.
        </Typography>
      </div>
      <Link href="/">
        <Button variant="primary">Voltar para o início</Button>
      </Link>
    </div>
  );
}
