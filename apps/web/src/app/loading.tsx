/**
 * Estado de carregamento global do App Router (convencao de arquivo
 * especial `loading.tsx`) — exibido automaticamente pelo Next.js
 * enquanto uma rota carrega. Segue o padrao "spinner minimalista" do
 * Dossie 10, Secao 9.8, reservado a transicoes de rota inteira; telas
 * individuais usarao Skeleton (Secao 9.9) quando implementadas.
 */
export default function GlobalLoading(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        role="status"
        aria-label="Carregando"
        className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-primary"
      />
    </div>
  );
}
