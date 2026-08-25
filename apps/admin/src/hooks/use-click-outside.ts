"use client";

import { useEffect, type RefObject } from "react";

/**
 * Fecha um dropdown/menu ao clicar fora dele — usado pelo menu de
 * "Ações rápidas" e pelo menu do avatar no cabeçalho do Admin Rotta
 * (Frente Mercury, pedido do usuário: "todos os botões devem... ser
 * responsivos"). Sem biblioteca externa de menu (nenhuma no monorepo
 * hoje) — hook pequeno o bastante pra não justificar uma dependência
 * nova.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutsideClick: () => void,
): void {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onOutsideClick]);
}
