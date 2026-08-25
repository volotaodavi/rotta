"use client";

import { AlertCircle, CheckCircle2, Info, X } from "@rotta/icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "../../utils/cn";

/**
 * Toast — mesmo `z-toast` já reservado em `@rotta/theme` (`zIndex.
 * toast`, Dossiê 25 §4.6) desde a primeira versão do catálogo, nunca
 * implementado até agora. Constrói o gap real encontrado nesta auditoria
 * (usuário: "não está havendo ações nos botões" no Admin): toda mutação
 * (`useMutation`) do app tem `retry: false` (`QueryProvider`) e NENHUMA
 * delas mostra o erro em lugar nenhum quando falha — o botão para de
 * carregar, a tela não muda, e do ponto de vista de quem clicou, "não
 * aconteceu nada". Não é bug de um botão específico, é a ausência total
 * de feedback de erro em qualquer mutação do produto inteiro.
 *
 * Mesmo princípio de `Modal` (Dossiê 36): sem dependência externa
 * (nenhuma lib de toast), `createPortal` no `document.body`.
 */
export type ToastVariant = "success" | "danger" | "info";

export interface ToastInput {
  variant?: ToastVariant;
  title?: string;
  message: string;
  /** ms antes de sumir sozinho. Omitido usa o padrão (6s); `0` fica até fechar manualmente — usado por padrão em `error()`, porque um motivo de falha precisa de tempo pra ser lido, não só piscar na tela. */
  duration?: number;
}

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  title?: string;
  duration: number;
}

export interface ToastContextValue {
  show: (input: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Ponte pra disparar um toast de FORA da árvore React — necessário porque
 * o gatilho mais importante (erro de qualquer `useMutation` do app,
 * `MutationCache.onError` em `QueryProvider`) roda fora de qualquer
 * componente. Só existe um `<ToastProvider>` real por app (montado uma vez
 * em `AppProviders`), então "o último provider montado" é sempre o
 * correto — não precisa de fila/replay: se disparar antes do provider
 * montar (só no primeiro instante da app, antes de qualquer mutação
 * poder rodar), o toast é descartado silenciosamente em vez de quebrar.
 */
let activeToastBridge: ((input: ToastInput) => void) | null = null;

export function pushToastFromOutsideReact(input: ToastInput): void {
  activeToastBridge?.(input);
}

const DEFAULT_DURATION = 6000;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-success/30 bg-surface-elevated text-success",
  danger: "border-danger/30 bg-surface-elevated text-danger",
  info: "border-primary/30 bg-surface-elevated text-primary",
};

const VARIANT_ICON: Record<ToastVariant, ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  danger: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [
      ...current,
      {
        id,
        variant: input.variant ?? "info",
        message: input.message,
        title: input.title,
        duration: input.duration ?? DEFAULT_DURATION,
      },
    ]);
  }, []);

  useEffect(() => {
    activeToastBridge = show;
    return () => {
      activeToastBridge = null;
    };
  }, [show]);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, title) => show({ variant: "success", message, title }),
      // Sem auto-dismiss por padrão: motivo de erro fica na tela até o
      // usuário fechar — 6s não é tempo suficiente pra ler e decidir o
      // que fazer com uma falha (ex.: "Didit não configurada").
      error: (message, title) => show({ variant: "danger", message, title, duration: 0 }),
      info: (message, title) => show({ variant: "info", message, title }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 sm:items-end"
            aria-live="polite"
          >
            {toasts.map((toast) => (
              <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }): JSX.Element {
  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `onDismiss` é recriado a cada render do pai por causa do `toast.id` no closure — só a duração/id deste toast específico deve reiniciar o timer.
  }, [toast.duration, toast.id]);

  const Icon = VARIANT_ICON[toast.variant];

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-modal",
        VARIANT_STYLES[toast.variant],
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        {toast.title && <p className="font-semibold text-text">{toast.title}</p>}
        <p className={toast.title ? "text-text-muted" : "text-text"}>{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar"
        className="shrink-0 rounded-sm p-0.5 text-text-muted transition-colors hover:text-text"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Fora de um `<ToastProvider>` (esquecido no layout raiz) lança um erro explícito na hora — melhor que engolir o `.show()` silenciosamente, que reproduziria o exato bug que este componente existe pra consertar. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast precisa ser usado dentro de <ToastProvider>.");
  }
  return context;
}
