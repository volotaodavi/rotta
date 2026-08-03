/**
 * Ícone de rota estilizado — mantém a identidade visual restrita a
 * azul/preto/branco/cinza (Dossiê 24) enquanto o logotipo real não
 * chega. Substituir pelo asset enviado pelo usuário assim que a marca
 * definitiva estiver disponível — nenhum ponto que importa `RouteMark`
 * depende do formato do ícone.
 */
export function RouteMark({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <circle cx="9" cy="22" r="2.5" className="fill-white" />
      <circle cx="23" cy="10" r="2.5" className="fill-white" />
      <path
        d="M9 22C9 22 9 14 16 14C23 14 23 10 23 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 4.5"
      />
    </svg>
  );
}
