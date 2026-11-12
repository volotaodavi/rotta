"use client";

import { Eye, EyeOff } from "@rotta/icons";

/**
 * O olho que revela a senha.
 *
 * ## O defeito que isto conserta (A11Y-04, `docs/53`)
 *
 * O botão media **18×18px** — o tamanho do ícone, sem padding nenhum.
 * A WCAG 2.5.8 (Target Size (Minimum), nível AA) exige 24×24. Medido
 * no navegador a 390px de largura, não estimado.
 *
 * Aqui ele vai a 44×44, que é o tamanho de alvo confortável para
 * polegar, sem o ícone mudar de tamanho: o que cresce é a área
 * clicável em volta dele.
 *
 * ## Por que virou componente, com só dois usos
 *
 * Porque eram dois usos com a MESMA marcação copiada, e um terceiro
 * campo de senha logo ali (confirmar nova senha) sem botão nenhum. Um
 * defeito de acessibilidade que mora em marcação duplicada volta pela
 * cópia que ninguém lembrou de corrigir — e volta calado, porque
 * nenhum teste de unidade mede pixel.
 *
 * ## `aria-label` e `aria-pressed` dizem coisas diferentes
 *
 * O rótulo diz o que o botão FAZ ("Mostrar senha"); o `aria-pressed`
 * diz em que estado ele ESTÁ. Um leitor de tela precisa dos dois para
 * a pessoa saber se a senha está visível agora — sem o `aria-pressed`,
 * a única pista é o ícone, que é exatamente o que ela não vê.
 */
export function PasswordToggleButton({
  mostrarSenha,
  onToggle,
}: {
  mostrarSenha: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
      aria-pressed={mostrarSenha}
      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-primary"
    >
      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
