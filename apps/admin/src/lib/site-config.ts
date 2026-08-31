/**
 * URL do Painel Web (`apps/web`) — usada só para o link de volta na
 * tela `/entrar` do Admin ("essa conta não é Admin Rotta → entre no
 * painel de cliente"), nunca para autenticação em si (os dois apps
 * continuam deploys/domínios isolados, Dossiê 22 §4.3).
 *
 * `https://rotta-web.vercel.app` é o domínio de produção REAL,
 * confirmado ao vivo (curl retornando `<title>Rotta — Transporte
 * escolar rastreado em tempo real</title>`) a partir do nome do
 * projeto Vercel (`rotta-web`, veja `apps/web/.vercel/project.json` —
 * a Vercel usa `<projectName>.vercel.app` como domínio padrão de
 * produção quando nenhum domínio próprio foi configurado ainda).
 * `NEXT_PUBLIC_WEB_URL` é o escape hatch: dev local (`apps/web` sobe em
 * `:3000`) e o dia em que `rottabr.com.br` (domínio oficial confirmado
 * pelo usuário 31/08/2026, DNS ainda a configurar — Dossiê 33 §4) tiver
 * o painel apontado nele só exige essa env var, nunca uma mudança de
 * código.
 */
export function getWebUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WEB_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return "https://rotta-web.vercel.app";
}
