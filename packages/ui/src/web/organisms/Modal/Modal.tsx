"use client";

import { X } from "@rotta/icons";
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "../../utils/cn";

/**
 * Modal — Dossiê 25 §4.6. Especificado desde a primeira versão do
 * catálogo, nunca implementado até agora (Dossiê 36 — Prompt 26,
 * evolução de UX/UI: construído sob demanda real, substituindo
 * `window.prompt`/`window.confirm`/`window.alert` — diálogos nativos
 * do navegador, sem identidade visual nenhuma, encontrados em telas
 * reais do Admin/Painel durante a auditoria desta entrega).
 *
 * Sem dependência externa (nenhum Radix/Headless UI) — mesmo
 * princípio de `Card`/`Table`: construído do zero, do jeito da Rotta.
 * `createPortal` no `document.body` evita que overflow/z-index de um
 * container pai qualquer corte o modal.
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Rótulo acessível quando não há `Modal.Header` visível (raro). */
  ariaLabel?: string;
}

const SELETOR_FOCAVEL = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, children, ariaLabel }: ModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  /*
    `onClose` fora das dependências do efeito, via ref.

    BUG corrigido 02/10/2026 (usuário, sobre o Admin: "a cada letra
    colocada ele buga e tenho que clicar sempre na caixa de escrita").
    `onClose` é arrow function inline em praticamente toda chamada de
    `Modal` da plataforma, então é uma referência NOVA a cada
    renderização de quem abriu o modal. Com `onClose` na lista de
    dependências, digitar UMA letra num campo dentro do modal
    re-renderizava o pai, o efeito era descartado e remontado, e as
    duas pontas dele tiravam o foco do campo: a limpeza devolvia o
    foco pra quem abriu o modal e o efeito novo focava o primeiro
    focável do painel (o "x" do cabeçalho). Resultado: só a primeira
    letra entrava, em TODO diálogo com campo de texto (empresas,
    alunos, veículos, rotas, planos, exclusão definitiva, contato do
    site). Guardado por `apps/web/src/components/modal-mantem-o-foco.spec.tsx`.
  */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Esc fecha; foco preso dentro do modal (Tab/Shift+Tab não escapam);
  // foco volta pro elemento que abriu o modal ao fechar (Dossiê 25 §4.6).
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;
    panelRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEL)?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      /*
        A lista é consultada AQUI, não na abertura: o conteúdo do
        modal muda enquanto ele está aberto (um preview que chega da
        API e revela campos novos, um passo que aparece). Uma lista
        capturada na abertura deixaria esses campos fora do ciclo de
        Tab e ainda prenderia o foco num elemento que já saiu do DOM.
      */
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-overlay flex items-center justify-center p-4">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- scrim: fechar por clique é conveniência de mouse, Esc/foco já cobrem teclado. */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="relative z-modal flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-surface shadow-modal"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ModalHeader({
  className,
  children,
  onClose,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border px-6 py-4",
        className,
      )}
      {...rest}
    >
      <div className="text-base font-semibold text-text">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-sm p-1 text-text-muted transition-colors hover:bg-secondary/20 hover:text-text"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function ModalBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-y-auto px-6 py-4", className)} {...rest} />;
}

function ModalFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...rest}
    />
  );
}

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
