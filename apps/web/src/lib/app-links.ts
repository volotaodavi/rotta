import type { Route } from "next";

/**
 * URL de destino do CTA principal "Começar agora" — configurável num
 * único lugar (pedido do usuário: "deixe uma constante... para que seja
 * facilmente substituída"). Já existe uma rota real de cadastro no
 * projeto (`/selecionar-perfil`, mesmo destino que o resto do site já
 * usa) — usada aqui em vez de um placeholder `"#"`, que só faria
 * sentido se nenhuma URL real existisse ainda.
 *
 * Extraído de `(marketing)/layout.tsx` (11/09/2026) — um `export`
 * nomeado num arquivo de rota (`layout.tsx`) só é seguro enquanto o
 * Next.js não precisa gerar tipos (`.next/types`) cruzando várias
 * rotas do mesmo grupo; a segunda página real do grupo `(marketing)`
 * fez o gerador de tipos do App Router acusar
 * `ROTTA_APP_URL`/`Route` como export inválido de arquivo de rota.
 * Constantes assim sempre devem morar em `src/lib`, nunca em
 * `layout.tsx`/`page.tsx`.
 */
export const ROTTA_APP_URL: Route = "/selecionar-perfil";
