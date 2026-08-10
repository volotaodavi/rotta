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

export function Modal({ isOpen, onClose, children, ariaLabel }: ModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Esc fecha; foco preso dentro do modal (Tab/Shift+Tab não escapam);
  // foco volta pro elemento que abriu o modal ao fechar (Dossiê 25 §4.6).
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !focusable || focusable.length === 0) return;

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
  }, [isOpen, onClose]);

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
