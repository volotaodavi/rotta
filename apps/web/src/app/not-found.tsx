import { Button, Typography } from "@rotta/ui/web";
import Link from "next/link";

import { RouteMark } from "@/components/route-mark";

/**
 * 404 personalizada do App Router (convenção de arquivo especial
 * `not-found.tsx`) — renderizada pelo Next.js sempre que uma rota não
 * existe ou uma página chama `notFound()`. Antes desta entrega, uma URL
 * quebrada caía na página em branco padrão do framework, sem marca e
 * sem caminho de volta; segue o mesmo padrão visual de `error.tsx`
 * (ícone/logo + frase curta + ação), agora já com os componentes reais
 * do Design System (`@rotta/ui`) em vez de HTML cru.
 *
 * Nunca expõe detalhe técnico (rota tentada, stack) — só orienta o
 * usuário a voltar pra um lugar conhecido.
 */
export default function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-text">
      <RouteMark className="h-16 w-16 opacity-90" />
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
